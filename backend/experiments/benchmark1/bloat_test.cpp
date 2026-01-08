#include <iostream>
#include <vector>
#include <string>
#include <atomic>
#include <emscripten/emscripten.h>
#include <webgpu/webgpu.h>

// Total operations we want to perform (approx 268 Million ops)
const uint32_t TOTAL_WORK_ITEMS = 268435456;

WGPUDevice device = nullptr;
WGPUQueue queue = nullptr;
WGPUComputePipeline pipeline = nullptr;
WGPUBuffer uniformBuffer = nullptr;
WGPUBindGroup bindGroup = nullptr;

struct Uniforms {
    uint32_t loopsPerThread;
};

// --- WGSL Shader ---
const char* shaderSource = R"(
struct Uniforms {
    loopsPerThread : u32,
};
@group(0) @binding(0) var<uniform> params : Uniforms;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    var a : f32 = f32(global_id.x) * 0.1;
    var b : f32 = 0.5;
    for (var i : u32 = 0u; i < params.loopsPerThread; i = i + 1u) {
        a = fma(a, b, 1.0);
        b = fract(a * 0.1);
    }
}
)";

// Helper to print a human-friendly message with some spacing
void print_divider() {
    std::cout << "-----------------------------------" << std::endl;
}

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

bool createShaderAndPipeline() {
    // Create shader module
    WGPUShaderModuleWGSLDescriptor wgslDesc = {};
    wgslDesc.chain.sType = WGPUSType_ShaderModuleWGSLDescriptor;
    wgslDesc.source = shaderSource;

    WGPUShaderModuleDescriptor smDesc = {};
    smDesc.nextInChain = reinterpret_cast<const WGPUChainedStruct*>(&wgslDesc);

    WGPUShaderModule module = wgpuDeviceCreateShaderModule(device, &smDesc);
    if (!module) return false;

    // Bind group layout
    WGPUBindGroupLayoutEntry bglEntries[1];
    bglEntries[0].binding = 0;
    bglEntries[0].visibility = WGPUShaderStage_Compute;
    bglEntries[0].buffer.type = WGPUBufferBindingType_Uniform;

    WGPUBindGroupLayoutDescriptor bglDesc = {};
    bglDesc.bindingCount = 1;
    bglDesc.entries = bglEntries;
    WGPUBindGroupLayout bgl = wgpuDeviceCreateBindGroupLayout(device, &bglDesc);

    // Pipeline layout
    WGPUPipelineLayoutDescriptor plDesc = {};
    plDesc.bindGroupLayoutCount = 1;
    plDesc.bindGroupLayouts = &bgl;
    WGPUPipelineLayout pipelineLayout = wgpuDeviceCreatePipelineLayout(device, &plDesc);

    // Compute pipeline
    WGPUProgrammableStageDescriptor computeStage = {};
    computeStage.module = module;
    computeStage.entryPoint = "main";

    WGPUComputePipelineDescriptor cpDesc = {};
    cpDesc.layout = pipelineLayout;
    cpDesc.compute = computeStage;

    pipeline = wgpuDeviceCreateComputePipeline(device, &cpDesc);

    // Uniform buffer
    WGPUBufferDescriptor ubDesc = {};
    ubDesc.size = sizeof(Uniforms);
    ubDesc.usage = WGPUBufferUsage_Uniform | WGPUBufferUsage_CopyDst;
    uniformBuffer = wgpuDeviceCreateBuffer(device, &ubDesc);

    // Bind group
    WGPUBindGroupEntry entries[1];
    entries[0].binding = 0;
    entries[0].buffer = uniformBuffer;
    entries[0].offset = 0;
    entries[0].size = sizeof(Uniforms);

    WGPUBindGroupDescriptor bgDesc = {};
    bgDesc.layout = bgl;
    bgDesc.entryCount = 1;
    bgDesc.entries = entries;
    bindGroup = wgpuDeviceCreateBindGroup(device, &bgDesc);

    // Release module and bgl/pipelineLayout (not strictly necessary here)
    wgpuShaderModuleRelease(module);
    wgpuBindGroupLayoutRelease(bgl);
    wgpuPipelineLayoutRelease(pipelineLayout);

    return true;
}

void run_test(const char* label, uint32_t gridX, uint32_t gridY) {
    uint32_t totalThreads = gridX * gridY * 64;
    uint32_t loops = std::max<uint32_t>(1, TOTAL_WORK_ITEMS / totalThreads);

    // Update Uniforms
    Uniforms u = { loops };
    wgpuQueueWriteBuffer(queue, uniformBuffer, 0, &u, sizeof(Uniforms));

    double t0 = emscripten_get_now();

    WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder(device, nullptr);
    WGPUComputePassEncoder pass = wgpuCommandEncoderBeginComputePass(encoder, nullptr);

    wgpuComputePassEncoderSetPipeline(pass, pipeline);
    wgpuComputePassEncoderSetBindGroup(pass, 0, bindGroup, 0, nullptr);
    wgpuComputePassEncoderDispatchWorkgroups(pass, gridX, gridY, 1);

    wgpuComputePassEncoderEnd(pass);
    WGPUCommandBuffer commands = wgpuCommandEncoderFinish(encoder, nullptr);

    wgpuQueueSubmit(queue, 1, &commands);

    double t1 = emscripten_get_now();

    // Cleanup
    wgpuCommandBufferRelease(commands);
    wgpuComputePassEncoderRelease(pass);
    wgpuCommandEncoderRelease(encoder);

    std::cout << "Test [" << label << "]:" << std::endl;
    std::cout << "  Grid: (" << gridX << "x" << gridY << ") | Threads: " << totalThreads << std::endl;
    std::cout << "  Loops/Thread: " << loops << std::endl;
    std::cout << "  CPU Dispatch Overhead: " << (t1 - t0) << " ms" << std::endl;
    print_divider();
}

int main() {
    std::cout << "--- BENCHMARK 1: COMMAND BUFFER BLOAT ---" << std::endl;

    // Request adapter/device
    WGPUInstanceDescriptor desc = {};
    WGPUInstance instance = wgpuCreateInstance(&desc);
    WGPURequestAdapterOptions options = {};
    wgpuInstanceRequestAdapter(instance, &options, onAdapterRequestEnded, nullptr);

    // Wait for device to be available
    int timeout = 0;
    while (!device && timeout < 200) {
        emscripten_sleep(50);
        timeout++;
    }
    if (!device) {
        std::cout << "Failed to obtain GPU device. Exiting." << std::endl;
        return 1;
    }

    if (!createShaderAndPipeline()) {
        std::cout << "Failed to create pipeline." << std::endl;
        return 1;
    }

    // SCENARIO 1: Minimal Dispatch (1 Group)
    run_test("Minimal (1 group)", 1, 1);

    // SCENARIO 2: Balanced
    run_test("Balanced", 64, 32);

    // SCENARIO 3: Bloated (single giant dispatch)
    run_test("Bloated (large grid)", 2048, 2048);

    // REFINE: Repeated small dispatches (dispatch called many times)
    std::cout << "Refinement: Repeated small dispatches (10000 dispatches of 1,1,1)" << std::endl;
    double t0 = emscripten_get_now();
    for (int i = 0; i < 10000; ++i) {
        WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder(device, nullptr);
        WGPUComputePassEncoder pass = wgpuCommandEncoderBeginComputePass(encoder, nullptr);
        wgpuComputePassEncoderSetPipeline(pass, pipeline);
        wgpuComputePassEncoderSetBindGroup(pass, 0, bindGroup, 0, nullptr);
        wgpuComputePassEncoderDispatchWorkgroups(pass, 1, 1, 1);
        wgpuComputePassEncoderEnd(pass);
        WGPUCommandBuffer commands = wgpuCommandEncoderFinish(encoder, nullptr);
        wgpuQueueSubmit(queue, 1, &commands);
        wgpuCommandBufferRelease(commands);
        wgpuComputePassEncoderRelease(pass);
        wgpuCommandEncoderRelease(encoder);
    }
    double t1 = emscripten_get_now();
    std::cout << "  Repeated dispatch overhead: " << (t1 - t0) << " ms for 10000 dispatches" << std::endl;
    print_divider();

    std::cout << "Benchmark complete." << std::endl;
    return 0;
}
