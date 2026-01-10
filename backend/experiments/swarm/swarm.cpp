#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <vector>
#include <cmath>
#include <algorithm>
#include <thread>
#include <mutex>
#include <chrono>

// Include OpenMP header if compiled with -fopenmp
#ifdef _OPENMP
#include <omp.h>
#endif

using namespace emscripten;

struct Boid {
    float x, y;
    float vx, vy;
    float ax, ay;
};

// Global simulation state
std::vector<Boid> boids;
const int NUM_BOIDS = 2000;
const float WIDTH = 800.0f;
const float HEIGHT = 600.0f;

// --- Helper Math ---
float dist_sq(const Boid& a, const Boid& b) {
    float dx = a.x - b.x;
    float dy = a.y - b.y;
    return dx*dx + dy*dy;
}

// Initialize
void init_boids(int count) {
    boids.resize(count);
    for(int i=0; i<count; i++) {
        boids[i].x = (float)(rand() % (int)WIDTH);
        boids[i].y = (float)(rand() % (int)HEIGHT);
        // Cast RAND_MAX to float to fix warning
        boids[i].vx = ((float)rand()/(float)RAND_MAX - 0.5f) * 4.0f;
        boids[i].vy = ((float)rand()/(float)RAND_MAX - 0.5f) * 4.0f;
        boids[i].ax = 0;
        boids[i].ay = 0;
    }
}

// --- OPTION A: Manual Pthreads (std::thread) ---
// This splits the work manually into chunks
void worker_thread_func(int start, int end, float dt) {
    for (int i = start; i < end; i++) {
        // Simple flocking logic placeholders
        boids[i].x += boids[i].vx * dt;
        boids[i].y += boids[i].vy * dt;
        
        // Bounce off walls
        if(boids[i].x < 0 || boids[i].x > WIDTH) boids[i].vx *= -1;
        if(boids[i].y < 0 || boids[i].y > HEIGHT) boids[i].vy *= -1;
    }
}

void update_boids(float dt) {
    int num_threads = 4; // Or std::thread::hardware_concurrency()
    std::vector<std::thread> threads;
    int chunk = boids.size() / num_threads;

    for(int t=0; t<num_threads; t++) {
        int start = t * chunk;
        int end = (t == num_threads - 1) ? boids.size() : (t + 1) * chunk;
        threads.emplace_back(worker_thread_func, start, end, dt);
    }

    for(auto& t : threads) {
        t.join();
    }
}

// --- OPTION B: OpenMP (Runtime Managed) ---
// The compiler handles the threading logic automatically
void update_boids_openmp(float dt) {
    // 1. Parallel Update
    // 'schedule(static)' is usually fastest for predictable loops like this
    #pragma omp parallel for schedule(static)
    for (int i = 0; i < (int)boids.size(); i++) {
        boids[i].x += boids[i].vx * dt;
        boids[i].y += boids[i].vy * dt;

        // Bounce
        if(boids[i].x < 0 || boids[i].x > WIDTH) boids[i].vx *= -1;
        if(boids[i].y < 0 || boids[i].y > HEIGHT) boids[i].vy *= -1;
    }
}

// Bindings
EMSCRIPTEN_BINDINGS(my_module) {
    function("init_boids", &init_boids);
    function("update_boids", &update_boids);       // Call for "WASM + Threads"
    function("update_boids_openmp", &update_boids_openmp); // Call for "WASM + OpenMP"
}

// Entry point (required for linking)
int main() {
    return 0;
}
