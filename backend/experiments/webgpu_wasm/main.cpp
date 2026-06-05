// Experimental Emscripten WebGPU benchmark.
//
// This uses Emscripten's browser WebGPU bridge (`-s USE_WEBGPU=1`), which is
// still maturing. Device creation, callback timing, supported limits/features,
// and the Dawn C++ wrapper surface can vary across Emscripten/browser versions.

#include <cstdint>
#include <cstdio>

#include <webgpu/webgpu_cpp.h>
#include <webgpu/webgpu.h>
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>

namespace {

wgpu::Instance g_instance;
wgpu::Adapter g_adapter;
wgpu::Device g_device;
wgpu::Queue g_queue;

wgpu::ShaderModule g_shaderModule;
wgpu::BindGroupLayout g_bindGroupLayout;
wgpu::PipelineLayout g_pipelineLayout;
wgpu::ComputePipeline g_pipeline;
wgpu::Buffer g_outputBuffer;
wgpu::Buffer g_timeBuffer;
wgpu::BindGroup g_bindGroup;

bool g_deviceRequestStarted = false;
bool g_deviceReady = false;
bool g_deviceFailed = false;
bool g_benchmarkResourcesReady = false;
bool g_benchmarkResourcesFailed = false;

constexpr uint32_t kElementCount = 1024;
constexpr uint32_t kWorkgroupSize = 64;
constexpr uint32_t kDispatchWorkgroups = kElementCount / kWorkgroupSize;

const char* kGenerativeShaderWGSL = R"(
@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    output[idx] = sin(f32(idx) * time) * cos(f32(idx) + time);
}
)";

void handleUncapturedError(WGPUErrorType type, const char* message, void*) {
    std::printf(
        "[webgpu_wasm] uncaptured device error type=%u: %s\n",
        static_cast<unsigned>(type),
        message ? message : "(no message)"
    );
}

void onDeviceRequested(
    WGPURequestDeviceStatus status,
    WGPUDevice device,
    const char* message,
    void*
) {
    if (status != WGPURequestDeviceStatus_Success || device == nullptr) {
        g_deviceFailed = true;
        std::printf(
            "[webgpu_wasm] requestDevice failed: %s\n",
            message ? message : "(no message)"
        );
        return;
    }

    g_device = wgpu::Device::Acquire(device);
    g_device.SetUncapturedErrorCallback(handleUncapturedError, nullptr);
    g_queue = g_device.GetQueue();
    g_deviceReady = true;

    std::printf("[webgpu_wasm] WebGPU device ready\n");
}

void onAdapterRequested(
    WGPURequestAdapterStatus status,
    WGPUAdapter adapter,
    const char* message,
    void*
) {
    if (status != WGPURequestAdapterStatus_Success || adapter == nullptr) {
        g_deviceFailed = true;
        std::printf(
            "[webgpu_wasm] requestAdapter failed: %s\n",
            message ? message : "(no message)"
        );
        return;
    }

    g_adapter = wgpu::Adapter::Acquire(adapter);

    wgpu::DeviceDescriptor descriptor{};
    descriptor.label = "benching_machine_webgpu_wasm_device";

    g_adapter.RequestDevice(&descriptor, onDeviceRequested, nullptr);
}

bool ensureDeviceRequestStarted() {
    if (g_deviceReady) {
        return true;
    }

    if (g_deviceFailed) {
        return false;
    }

    if (g_deviceRequestStarted) {
        return false;
    }

    g_deviceRequestStarted = true;
    g_instance = wgpu::CreateInstance();

    wgpu::RequestAdapterOptions options{};
    options.powerPreference = wgpu::PowerPreference::HighPerformance;

    g_instance.RequestAdapter(&options, onAdapterRequested, nullptr);
    return false;
}

bool createBenchmarkResources() {
    if (g_benchmarkResourcesReady) {
        return true;
    }

    if (g_benchmarkResourcesFailed || !g_deviceReady) {
        return false;
    }

    wgpu::ShaderModuleWGSLDescriptor wgslDescriptor{};
    wgslDescriptor.chain.sType = wgpu::SType::ShaderModuleWGSLDescriptor;
    wgslDescriptor.source = kGenerativeShaderWGSL;

    wgpu::ShaderModuleDescriptor shaderModuleDescriptor{};
    shaderModuleDescriptor.nextInChain = &wgslDescriptor.chain;
    shaderModuleDescriptor.label = "webgpu_wasm_generative_shader";
    g_shaderModule = g_device.CreateShaderModule(&shaderModuleDescriptor);

    wgpu::BindGroupLayoutEntry layoutEntries[2]{};
    layoutEntries[0].binding = 0;
    layoutEntries[0].visibility = wgpu::ShaderStage::Compute;
    layoutEntries[0].buffer.type = wgpu::BufferBindingType::Uniform;
    layoutEntries[0].buffer.minBindingSize = sizeof(float);

    layoutEntries[1].binding = 1;
    layoutEntries[1].visibility = wgpu::ShaderStage::Compute;
    layoutEntries[1].buffer.type = wgpu::BufferBindingType::Storage;
    layoutEntries[1].buffer.minBindingSize = kElementCount * sizeof(float);

    wgpu::BindGroupLayoutDescriptor bindGroupLayoutDescriptor{};
    bindGroupLayoutDescriptor.label = "webgpu_wasm_generative_bind_group_layout";
    bindGroupLayoutDescriptor.entryCount = 2;
    bindGroupLayoutDescriptor.entries = layoutEntries;
    g_bindGroupLayout = g_device.CreateBindGroupLayout(&bindGroupLayoutDescriptor);

    wgpu::PipelineLayoutDescriptor pipelineLayoutDescriptor{};
    pipelineLayoutDescriptor.label = "webgpu_wasm_generative_pipeline_layout";
    pipelineLayoutDescriptor.bindGroupLayoutCount = 1;
    pipelineLayoutDescriptor.bindGroupLayouts = &g_bindGroupLayout;
    g_pipelineLayout = g_device.CreatePipelineLayout(&pipelineLayoutDescriptor);

    wgpu::ComputePipelineDescriptor pipelineDescriptor{};
    pipelineDescriptor.label = "webgpu_wasm_generative_pipeline";
    pipelineDescriptor.layout = g_pipelineLayout;
    pipelineDescriptor.compute.module = g_shaderModule;
    pipelineDescriptor.compute.entryPoint = "main";
    g_pipeline = g_device.CreateComputePipeline(&pipelineDescriptor);

    wgpu::BufferDescriptor outputBufferDescriptor{};
    outputBufferDescriptor.label = "webgpu_wasm_generative_output";
    outputBufferDescriptor.size = kElementCount * sizeof(float);
    outputBufferDescriptor.usage = wgpu::BufferUsage::Storage | wgpu::BufferUsage::CopySrc;
    g_outputBuffer = g_device.CreateBuffer(&outputBufferDescriptor);

    wgpu::BufferDescriptor timeBufferDescriptor{};
    timeBufferDescriptor.label = "webgpu_wasm_generative_time";
    timeBufferDescriptor.size = sizeof(float);
    timeBufferDescriptor.usage = wgpu::BufferUsage::Uniform | wgpu::BufferUsage::CopyDst;
    g_timeBuffer = g_device.CreateBuffer(&timeBufferDescriptor);

    wgpu::BindGroupEntry bindGroupEntries[2]{};
    bindGroupEntries[0].binding = 0;
    bindGroupEntries[0].buffer = g_timeBuffer;
    bindGroupEntries[0].offset = 0;
    bindGroupEntries[0].size = sizeof(float);

    bindGroupEntries[1].binding = 1;
    bindGroupEntries[1].buffer = g_outputBuffer;
    bindGroupEntries[1].offset = 0;
    bindGroupEntries[1].size = kElementCount * sizeof(float);

    wgpu::BindGroupDescriptor bindGroupDescriptor{};
    bindGroupDescriptor.label = "webgpu_wasm_generative_bind_group";
    bindGroupDescriptor.layout = g_bindGroupLayout;
    bindGroupDescriptor.entryCount = 2;
    bindGroupDescriptor.entries = bindGroupEntries;
    g_bindGroup = g_device.CreateBindGroup(&bindGroupDescriptor);

    g_benchmarkResourcesReady = true;
    return true;
}

void waitForSubmittedWork() {
    struct WorkDoneState {
        bool done = false;
    };

    WorkDoneState state{};

    wgpuQueueOnSubmittedWorkDone(
        g_queue.Get(),
        [](WGPUQueueWorkDoneStatus, void* userdata) {
            static_cast<WorkDoneState*>(userdata)->done = true;
        },
        &state
    );

    for (int tick = 0; !state.done && tick < 10000; ++tick) {
        g_instance.ProcessEvents();
    }

    if (!state.done) {
        std::printf("[webgpu_wasm] timed out waiting for submitted work\n");
    }
}

} // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE
int initializeWebGPUDevice() {
    return ensureDeviceRequestStarted() ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
int isWebGPUDeviceReady() {
    return g_deviceReady ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
int hasWebGPUDeviceFailed() {
    return g_deviceFailed ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
double runGenerativeShaderOverhead(int numFrames) {
    if (numFrames <= 0) {
        return 0.0;
    }

    if (!g_deviceReady) {
        ensureDeviceRequestStarted();
        std::printf("[webgpu_wasm] device is not ready yet\n");
        return -1.0;
    }

    if (!createBenchmarkResources()) {
        std::printf("[webgpu_wasm] failed to create benchmark resources\n");
        return -2.0;
    }

    const double startMs = emscripten_get_now();

    for (int frame = 0; frame < numFrames; ++frame) {
        const float time = static_cast<float>(frame) * 0.016f;

        // Emscripten glue overhead hot spot: this crosses from C++/WASM into
        // the browser WebGPU JS binding to call GPUQueue.writeBuffer.
        g_queue.WriteBuffer(g_timeBuffer, 0, &time, sizeof(time));

        wgpu::CommandEncoderDescriptor encoderDescriptor{};
        encoderDescriptor.label = "webgpu_wasm_dispatch_overhead_encoder";

        // Emscripten glue overhead hot spot: command encoder creation is an
        // API-heavy WebGPU call with little native C++ math to amortize it.
        wgpu::CommandEncoder encoder = g_device.CreateCommandEncoder(&encoderDescriptor);

        wgpu::ComputePassDescriptor computePassDescriptor{};
        computePassDescriptor.label = "webgpu_wasm_dispatch_overhead_pass";

        wgpu::ComputePassEncoder pass = encoder.BeginComputePass(&computePassDescriptor);
        pass.SetPipeline(g_pipeline);
        pass.SetBindGroup(0, g_bindGroup);
        pass.DispatchWorkgroups(kDispatchWorkgroups, 1, 1);
        pass.End();

        wgpu::CommandBufferDescriptor commandBufferDescriptor{};
        commandBufferDescriptor.label = "webgpu_wasm_dispatch_overhead_commands";

        wgpu::CommandBuffer commands = encoder.Finish(&commandBufferDescriptor);

        // Emscripten glue overhead hot spot: submit marshals the command buffer
        // handle across the WASM/JS boundary for every measured frame.
        g_queue.Submit(1, &commands);
    }

    waitForSubmittedWork();

    const double elapsedMs = emscripten_get_now() - startMs;
    return elapsedMs > 0.0 ? (static_cast<double>(numFrames) * 1000.0) / elapsedMs : 0.0;
}

}

int main() {
    initializeWebGPUDevice();
    return 0;
}
