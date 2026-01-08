#include <iostream>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <cmath>
#include <emscripten/emscripten.h>
#include <webgpu/webgpu.h>

// --- Configuration ---
const size_t DATA_SIZE = 1024 * 1024 * 4; // 4M floats (~16MB)
const int NUM_FRAMES = 10;

// --- State ---
WGPUDevice device = nullptr;
WGPUQueue queue = nullptr;
WGPUBuffer gpuBuffer = nullptr; // A single massive storage buffer on GPU

// Two CPU buffers for "Ping-Pong" (allocate as vectors so we can pass .data())
static std::vector<float> cpuBufferA;
static std::vector<float> cpuBufferB;

// Sync Primitives
std::mutex mtx;
std::condition_variable cv_upload; // Signals GPU thread to work
std::condition_variable cv_compute; // Signals Compute thread to work

// State Flags
std::atomic<bool> bufferA_ready_for_upload(false);
std::atomic<bool> bufferB_ready_for_upload(false);
std::atomic<bool> done(false);

// --- WebGPU Helper (Simplified) ---
void onDeviceRequestEnded(WGPURequestDeviceStatus status, WGPUDevice inDevice, const char* message, void* userdata) {
    if (status == WGPURequestDeviceStatus_Success) {
        device = inDevice;
        queue = wgpuDeviceGetQueue(device);
        std::cout << "[setup] Acquired device and queue." << std::endl;
    } else {
        std::cout << "[setup] Failed to get device: " << (message ? message : "(no message)") << std::endl;
    }
}

void onAdapterRequestEnded(WGPURequestAdapterStatus status, WGPUAdapter adapter, const char* message, void* userdata) {
    if (status == WGPURequestAdapterStatus_Success) {
        WGPUDeviceDescriptor deviceDesc = {};
        wgpuAdapterRequestDevice(adapter, &deviceDesc, onDeviceRequestEnded, nullptr);
    } else {
        std::cout << "[setup] Failed to get adapter." << std::endl;
    }
}

// --- The "Heavy" OpenMP-like Math Task (simulated with threads here) ---
void generate_data(std::vector<float>& buffer, int seed) {
    // Simulate heavy math; we micro-parallelize using std::thread for portability
    const int workers = 4; // approximate parallelism; in real PoC you'd use OpenMP
    std::vector<std::thread> pool;
    size_t chunk = buffer.size() / workers;
    for (int w = 0; w < workers; ++w) {
        size_t start = w * chunk;
        size_t end = (w == workers -1) ? buffer.size() : start + chunk;
        pool.emplace_back([start, end, seed, &buffer]() {
            for (size_t i = start; i < end; ++i) {
                float x = float(i) * 0.0001f + seed;
                buffer[i] = std::sin(x) * std::cos(x) + std::sqrt(x);
            }
        });
    }
    for (auto &t : pool) t.join();
}

// --- The GPU Upload Thread (Consumer) ---
void gpu_worker_thread() {
    std::cout << "[GPU Thread] Started. Waiting for data..." << std::endl;
    for (int frame = 0; frame < NUM_FRAMES; frame++) {
        std::unique_lock<std::mutex> lk(mtx);
        cv_upload.wait(lk, []{ return bufferA_ready_for_upload.load() || bufferB_ready_for_upload.load() || done.load(); });
        if (done.load()) break;

        if (bufferA_ready_for_upload.load()) {
            // copy/upload A
            lk.unlock();
            double t0 = emscripten_get_now();
            wgpuQueueWriteBuffer(queue, gpuBuffer, 0, cpuBufferA.data(), cpuBufferA.size() * sizeof(float));
            double t1 = emscripten_get_now();
            std::cout << "[GPU Thread] Uploaded A in " << (t1 - t0) << " ms" << std::endl;
            bufferA_ready_for_upload.store(false);
            cv_compute.notify_one();
        } else if (bufferB_ready_for_upload.load()) {
            lk.unlock();
            double t0 = emscripten_get_now();
            wgpuQueueWriteBuffer(queue, gpuBuffer, 0, cpuBufferB.data(), cpuBufferB.size() * sizeof(float));
            double t1 = emscripten_get_now();
            std::cout << "[GPU Thread] Uploaded B in " << (t1 - t0) << " ms" << std::endl;
            bufferB_ready_for_upload.store(false);
            cv_compute.notify_one();
        }
    }
    std::cout << "[GPU Thread] Finished." << std::endl;
}

// Serial variant (no uploader thread) for comparison
void run_serial() {
    double t0 = emscripten_get_now();
    for (int frame = 0; frame < NUM_FRAMES; ++frame) {
        generate_data(cpuBufferA, frame);
        double t_upload0 = emscripten_get_now();
        wgpuQueueWriteBuffer(queue, gpuBuffer, 0, cpuBufferA.data(), cpuBufferA.size() * sizeof(float));
        double t_upload1 = emscripten_get_now();
        std::cout << "[Serial] Frame " << frame << " upload took " << (t_upload1 - t_upload0) << " ms" << std::endl;
    }
    double t1 = emscripten_get_now();
    std::cout << "[Serial] Total time: " << (t1 - t0) << " ms" << std::endl;
}

// Pipelined variant using double-buffer + uploader
void run_pipelined() {
    // Start GPU worker
    std::thread uploader(gpu_worker_thread);

    double t0 = emscripten_get_now();

    for (int frame = 0; frame < NUM_FRAMES; ++frame) {
        // Compute A
        generate_data(cpuBufferA, frame);
        {
            std::lock_guard<std::mutex> lk(mtx);
            bufferA_ready_for_upload.store(true);
        }
        cv_upload.notify_one();

        // Compute B while A is uploading
        generate_data(cpuBufferB, frame + 1);

        // Wait for A to finish uploading before we overwrite it
        {
            std::unique_lock<std::mutex> lk(mtx);
            cv_compute.wait(lk, []{ return !bufferA_ready_for_upload.load(); });
        }

        // Signal B
        {
            std::lock_guard<std::mutex> lk(mtx);
            bufferB_ready_for_upload.store(true);
        }
        cv_upload.notify_one();

        // Wait for B
        {
            std::unique_lock<std::mutex> lk(mtx);
            cv_compute.wait(lk, []{ return !bufferB_ready_for_upload.load(); });
        }
    }

    // Cleanup
    {
        std::lock_guard<std::mutex> lk(mtx);
        done.store(true);
    }
    cv_upload.notify_one();
    uploader.join();

    double t1 = emscripten_get_now();
    std::cout << "[Pipelined] Total time: " << (t1 - t0) << " ms" << std::endl;
}

int main() {
    std::cout << "--- UPLOAD STRATEGY BENCHMARK (PoC) ---" << std::endl;

    // Allocate buffers
    cpuBufferA.resize(DATA_SIZE);
    cpuBufferB.resize(DATA_SIZE);

    // Request adapter/device
    WGPUInstanceDescriptor desc = {};
    WGPUInstance instance = wgpuCreateInstance(&desc);
    WGPURequestAdapterOptions options = {};
    wgpuInstanceRequestAdapter(instance, &options, onAdapterRequestEnded, nullptr);

    // Wait for device
    int timeout = 0;
    while (!device && timeout < 200) {
        emscripten_sleep(50);
        timeout++;
    }
    if (!device) {
        std::cout << "Failed to obtain GPU device. Exiting." << std::endl;
        return 1;
    }

    // Create GPU buffer
    WGPUBufferDescriptor bufDesc = {};
    bufDesc.size = DATA_SIZE * sizeof(float);
    bufDesc.usage = WGPUBufferUsage_CopyDst | WGPUBufferUsage_Storage;
    gpuBuffer = wgpuDeviceCreateBuffer(device, &bufDesc);

    // Run serial then pipelined
    std::cout << "Running serial benchmark..." << std::endl;
    run_serial();

    std::cout << "Running pipelined benchmark..." << std::endl;
    run_pipelined();

    std::cout << "Benchmark complete." << std::endl;
    return 0;
}
