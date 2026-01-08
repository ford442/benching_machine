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

// Helper: non-blocking queue completion printer
void queue_completion_printer(double submitTime) {
    struct QD { double submit; } *qd = new QD{submitTime};
    wgpuQueueOnSubmittedWorkDone(queue, [](WGPUQueueWorkDoneStatus status, void* userdata){ QD* d = (QD*)userdata; double end = emscripten_get_now(); std::cout << "[GPU] Completion after " << (end - d->submit) << " ms" << std::endl; delete d; }, qd);
}

// --- The GPU Upload Thread (Consumer) ---
void gpu_worker_thread() {
    std::cout << "[GPU Thread] Started. Waiting for data..." << std::endl;
    for (int frame = 0; frame < NUM_FRAMES; frame++) {
        std::unique_lock<std::mutex> lk(mtx);
        cv_upload.wait(lk, []{ return bufferA_ready_for_upload.load() || bufferB_ready_for_upload.load() || done.load(); });
        if (done.load()) break;

        if (bufferA_ready_for_upload.load()) {
            // copy/upload A (writeBuffer)
            lk.unlock();
            double t0 = emscripten_get_now();
            wgpuQueueWriteBuffer(queue, gpuBuffer, 0, cpuBufferA.data(), cpuBufferA.size() * sizeof(float));
            double t1 = emscripten_get_now();
            std::cout << "[GPU Thread] Uploaded A (writeBuffer) in " << (t1 - t0) << " ms" << std::endl;
            queue_completion_printer(t1);
            bufferA_ready_for_upload.store(false);
            cv_compute.notify_one();
        } else if (bufferB_ready_for_upload.load()) {
            lk.unlock();
            double t0 = emscripten_get_now();
            wgpuQueueWriteBuffer(queue, gpuBuffer, 0, cpuBufferB.data(), cpuBufferB.size() * sizeof(float));
            double t1 = emscripten_get_now();
            std::cout << "[GPU Thread] Uploaded B (writeBuffer) in " << (t1 - t0) << " ms" << std::endl;
            queue_completion_printer(t1);
            bufferB_ready_for_upload.store(false);
            cv_compute.notify_one();
        }
    }
    std::cout << "[GPU Thread] Finished." << std::endl;
}

// Staging upload helper (blocking until GPU completion)
bool staging_upload_and_wait(const float* data, size_t byteSize, double &uploadTimeMs, double &gpuCompleteMs) {
    // Create staging buffer
    WGPUBufferDescriptor stagingDesc = {};
    stagingDesc.size = byteSize;
    stagingDesc.usage = WGPUBufferUsage_MapWrite | WGPUBufferUsage_CopySrc;
    WGPUBuffer staging = wgpuDeviceCreateBuffer(device, &stagingDesc);

    // Map async
    struct MapDone { bool done; } md{false};
    wgpuBufferMapAsync(staging, WGPUMapMode_Write, 0, byteSize, [](WGPUBufferMapAsyncStatus status, void* userdata){ ((MapDone*)userdata)->done = true; }, &md);
    int wait = 0; while (!md.done && wait < 1000) { emscripten_sleep(1); wait++; }
    if (!md.done) { wgpuBufferRelease(staging); return false; }

    void* ptr = wgpuBufferGetMappedRange(staging, 0, byteSize);
    double t_map = emscripten_get_now();
    memcpy(ptr, data, byteSize);
    wgpuBufferUnmap(staging);
    double t_unmap = emscripten_get_now();

    // Copy staging -> gpuBuffer
    WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder(device, nullptr);
    wgpuCommandEncoderCopyBufferToBuffer(encoder, staging, 0, gpuBuffer, 0, byteSize);
    WGPUCommandBuffer cb = wgpuCommandEncoderFinish(encoder, nullptr);

    double t_submit = emscripten_get_now();
    wgpuQueueSubmit(queue, 1, &cb);

    // Wait for GPU completion
    struct QDone { double submit; double end; bool done; } qd{ t_submit, 0.0, false };
    wgpuQueueOnSubmittedWorkDone(queue, [](WGPUQueueWorkDoneStatus status, void* userdata){ QDone* d = (QDone*)userdata; d->end = emscripten_get_now(); d->done = true; }, &qd);
    int wait2 = 0; while (!qd.done && wait2 < 10000) { emscripten_sleep(1); wait2++; }

    double endTime = qd.done ? qd.end : -1.0;
    uploadTimeMs = (t_unmap - t_map);
    gpuCompleteMs = (endTime > 0.0) ? (endTime - t_submit) : -1.0;

    // cleanup
    wgpuCommandBufferRelease(cb);
    wgpuBufferRelease(staging);

    return qd.done;
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

// Staging-capable GPU uploader thread (uses staging_map -> copy -> submit)
void gpu_worker_thread_staging() {
    std::cout << "[GPU Thread (staging)] Started. Waiting for data..." << std::endl;
    for (int frame = 0; frame < NUM_FRAMES; frame++) {
        std::unique_lock<std::mutex> lk(mtx);
        cv_upload.wait(lk, []{ return bufferA_ready_for_upload.load() || bufferB_ready_for_upload.load() || done.load(); });
        if (done.load()) break;

        if (bufferA_ready_for_upload.load()) {
            lk.unlock();
            double uploadMs, gpuMs;
            bool ok = staging_upload_and_wait(cpuBufferA.data(), cpuBufferA.size() * sizeof(float), uploadMs, gpuMs);
            if (ok) std::cout << "[GPU Thread (staging)] Uploaded A: map copy=" << uploadMs << " ms, GPU complete=" << gpuMs << " ms" << std::endl;
            else std::cout << "[GPU Thread (staging)] FAILED to upload A via staging" << std::endl;
            bufferA_ready_for_upload.store(false);
            cv_compute.notify_one();
        } else if (bufferB_ready_for_upload.load()) {
            lk.unlock();
            double uploadMs, gpuMs;
            bool ok = staging_upload_and_wait(cpuBufferB.data(), cpuBufferB.size() * sizeof(float), uploadMs, gpuMs);
            if (ok) std::cout << "[GPU Thread (staging)] Uploaded B: map copy=" << uploadMs << " ms, GPU complete=" << gpuMs << " ms" << std::endl;
            else std::cout << "[GPU Thread (staging)] FAILED to upload B via staging" << std::endl;
            bufferB_ready_for_upload.store(false);
            cv_compute.notify_one();
        }
    }
    std::cout << "[GPU Thread (staging)] Finished." << std::endl;
}

// Pipelined variant using writeBuffer (existing) - unchanged name for backwards compatibility
void run_pipelined_writeBuffer() {
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
    std::cout << "[Pipelined (writeBuffer)] Total time: " << (t1 - t0) << " ms" << std::endl;
}

// Pipelined variant using staging uploads
void run_pipelined_staging() {
    // reset done flag
    done.store(false);
    std::thread uploader(gpu_worker_thread_staging);

    double t0 = emscripten_get_now();

    for (int frame = 0; frame < NUM_FRAMES; ++frame) {
        generate_data(cpuBufferA, frame);
        {
            std::lock_guard<std::mutex> lk(mtx);
            bufferA_ready_for_upload.store(true);
        }
        cv_upload.notify_one();

        generate_data(cpuBufferB, frame + 1);

        {
            std::unique_lock<std::mutex> lk(mtx);
            cv_compute.wait(lk, []{ return !bufferA_ready_for_upload.load(); });
        }

        {
            std::lock_guard<std::mutex> lk(mtx);
            bufferB_ready_for_upload.store(true);
        }
        cv_upload.notify_one();

        {
            std::unique_lock<std::mutex> lk(mtx);
            cv_compute.wait(lk, []{ return !bufferB_ready_for_upload.load(); });
        }
    }

    {
        std::lock_guard<std::mutex> lk(mtx);
        done.store(true);
    }
    cv_upload.notify_one();
    uploader.join();

    double t1 = emscripten_get_now();
    std::cout << "[Pipelined (staging)] Total time: " << (t1 - t0) << " ms" << std::endl;
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

    // Run serial (writeBuffer)
    std::cout << "Running serial benchmark (writeBuffer)..." << std::endl;
    run_serial();

    // Run serial (staging)
    std::cout << "Running serial benchmark (staging)..." << std::endl;
    // perform a staging-based serial test
    double s_t0 = emscripten_get_now();
    for (int frame = 0; frame < NUM_FRAMES; ++frame) {
        generate_data(cpuBufferA, frame);
        double uploadMs = 0.0, gpuMs = 0.0;
        bool ok = staging_upload_and_wait(cpuBufferA.data(), cpuBufferA.size() * sizeof(float), uploadMs, gpuMs);
        if (ok) std::cout << "[Serial (staging)] Frame " << frame << " upload(ms)=" << uploadMs << " gpu(ms)=" << gpuMs << std::endl; else std::cout << "[Serial (staging)] Frame " << frame << " FAILED" << std::endl;
    }
    double s_t1 = emscripten_get_now();
    std::cout << "[Serial (staging)] Total time: " << (s_t1 - s_t0) << " ms" << std::endl;

    // Pipelined writeBuffer
    std::cout << "Running pipelined benchmark (writeBuffer)..." << std::endl;
    // reset flags
    bufferA_ready_for_upload.store(false); bufferB_ready_for_upload.store(false); done.store(false);
    run_pipelined_writeBuffer();

    // Pipelined staging
    std::cout << "Running pipelined benchmark (staging)..." << std::endl;
    bufferA_ready_for_upload.store(false); bufferB_ready_for_upload.store(false); done.store(false);
    run_pipelined_staging();

    std::cout << "Benchmark complete." << std::endl;
    return 0;
}
