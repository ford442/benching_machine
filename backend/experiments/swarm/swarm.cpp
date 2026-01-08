// Swarm PoC: spawn multiple threads, each requests its own WebGPU device and runs a compute pass
// Experimental: requires Emscripten + WebGPU + pthreads support

#include <iostream>
#include <vector>
#include <thread>
#include <mutex>
#include <emscripten/emscripten.h>
#include <webgpu/webgpu.h>

// Mutex to keep console output clean
std::mutex cout_mutex;

// --- WebGPU Boilerplate Helpers (Callbacks) ---

struct ThreadContext {
    int id;
    WGPUDevice device;
    WGPUQueue queue;
    bool finished;
};

// Callback when Device is received
void onDeviceRequestEnded(WGPURequestDeviceStatus status, WGPUDevice device, const char* message, void* userdata) {
    ThreadContext* ctx = (ThreadContext*)userdata;
    if (status == WGPURequestDeviceStatus_Success) {
        ctx->device = device;
        ctx->queue = wgpuDeviceGetQueue(device);
        
        std::lock_guard<std::mutex> lock(cout_mutex);
        std::cout << "[Thread " << ctx->id << "] Acquired GPU Device!" << std::endl;
    } else {
        std::lock_guard<std::mutex> lock(cout_mutex);
        std::cout << "[Thread " << ctx->id << "] Failed to get device: " << (message ? message : "(no message)") << std::endl;
    }
}

// Callback when Adapter is received
void onAdapterRequestEnded(WGPURequestAdapterStatus status, WGPUAdapter adapter, const char* message, void* userdata) {
    ThreadContext* ctx = (ThreadContext*)userdata;
    if (status == WGPURequestAdapterStatus_Success) {
        // We have an adapter, now ask for a device
        WGPUDeviceDescriptor deviceDesc = {}; // Default descriptor
        wgpuAdapterRequestDevice(adapter, &deviceDesc, onDeviceRequestEnded, ctx);
    } else {
        std::lock_guard<std::mutex> lock(cout_mutex);
        std::cout << "[Thread " << ctx->id << "] Failed to get adapter." << std::endl;
    }
}

// --- The Thread Logic ---

void run_gpu_thread(int id) {
    {
        std::lock_guard<std::mutex> lock(cout_mutex);
        std::cout << "[Thread " << id << "] Spawning..." << std::endl;
    }

    ThreadContext ctx = { id, nullptr, nullptr, false };

    // 1. Get the WebGPU Instance
    WGPUInstanceDescriptor desc = {};
    WGPUInstance instance = wgpuCreateInstance(&desc);

    // 2. Request Adapter (Async)
    WGPURequestAdapterOptions options = {};
    wgpuInstanceRequestAdapter(instance, &options, onAdapterRequestEnded, &ctx);

    // 3. THE HACK: Keep thread alive while waiting for Async JS events
    // In a real app, you'd use a proper event loop or condition variable.
    // Here we spin briefly to allow the callback to fire.
    int timeout = 0;
    while(ctx.device == nullptr && timeout < 100) {
        // Give the browser a chance to process the adapter/device callbacks
        emscripten_sleep(100);
        timeout++;
    }

    if (ctx.device) {
        // --- THIS IS WHERE YOU RUN YOUR COMPUTE SHADER ---
        {
            std::lock_guard<std::mutex> lock(cout_mutex);
            std::cout << "[Thread " << id << "] Running Compute Pass on my personal GPU Device..." << std::endl;
        }

        // Minimal demonstration: release queue/device
        wgpuQueueRelease(ctx.queue);
        wgpuDeviceRelease(ctx.device);
    } else {
        std::lock_guard<std::mutex> lock(cout_mutex);
        std::cout << "[Thread " << id << "] Timed out waiting for GPU." << std::endl;
    }
}

int main() {
    std::cout << "--- STARTING THE SWARM ---" << std::endl;

    std::vector<std::thread> swarm;
    
    // Launch 4 threads
    for (int i = 0; i < 4; i++) {
        swarm.push_back(std::thread(run_gpu_thread, i));
    }

    // Join them
    for (auto& t : swarm) {
        t.join();
    }

    std::cout << "--- SWARM FINISHED ---" << std::endl;
    return 0;
}
