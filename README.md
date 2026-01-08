# 🚀 Benching Machine

A comprehensive benchmarking tool for comparing performance across JavaScript, Rust, and WebAssembly (WASM). Features an immersive visualization resembling a "long hallway of rack computers" where each rack displays live benchmark bars and test results.

## ✨ Features

- **Modular Benchmarks**: CPU, Memory, and Compilation time benchmarks
- **Multiple Technologies**: JavaScript (with Rust and WASM stubs for future expansion)
- **CLI Runner**: Command-line interface for running benchmarks
- **Interactive Web UI**: React-based visualization with animated server rack hallway
- **Real-time Results**: Live benchmark bars with operations per second metrics
- **2D/Perspective Views**: Toggle between visualization modes (3D ready for future expansion)

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install
```

### Running Benchmarks

#### CLI Mode

```bash
# Run all benchmarks
npm run bench

# Or use the start script
npm start

# Run specific benchmark categories
node src/cli.js run --cpu          # CPU benchmarks only
node src/cli.js run --memory       # Memory benchmarks only
node src/cli.js run --compilation  # Compilation benchmarks only

# Save results to file
node src/cli.js run --output results.json

# List available benchmarks
node src/cli.js list
```

#### Web UI Mode

```bash
# Start the web visualization
npm run web
```

Then open your browser to `http://localhost:3000` to see the interactive hallway visualization.

## 📊 Benchmark Categories

### CPU Benchmarks
- **Fibonacci(20)**: Recursive calculation testing CPU-intensive operations
- **Prime Check**: Tests 10,000 numbers for primality
- **Matrix Multiply**: 10x10 matrix multiplication

### Memory Benchmarks
- **Array Operations**: 10k element array manipulation
- **Object Creation**: Create 1k objects with properties
- **String Concatenation**: 1k string operations
- **Typed Array Operations**: 10k element typed array processing

### Compilation Benchmarks
- **Regular Function**: 10k function calls baseline
- **Arrow vs Regular**: Compare function types
- **Dynamic Function Creation**: Runtime function generation
- **WASM Compilation**: Simulated WebAssembly compilation

## 🎨 Visualization

The web UI features an immersive "hallway of rack computers" visualization:

- **2D View**: Flat view of server racks showing benchmark results
- **Perspective View**: Depth-based perspective for immersive experience
- **Live Updates**: Real-time animated bars showing operations per second
- **Color-coded Results**: Performance metrics with gradient animations
- **Blinking LEDs**: Visual indicators for active benchmarks

### Future 3D Expansion

The current implementation uses 2D Canvas with notes for 3D expansion:
- Placeholder for Three.js/WebGL integration
- Camera navigation controls
- Interactive rack exploration
- Detailed per-server views

## 📁 Project Structure

```
benching_machine/
├── backend/                    # CLI and benchmark logic
│   ├── benchmarks/
│   │   ├── cpu.js              # CPU benchmark module
│   │   ├── memory.js           # Memory benchmark module
│   │   ├── compilation.js      # Compilation benchmark module
│   │   ├── index.js            # Benchmark exports
│   │   ├── rust/              # Rust benchmarks (stub)
│   │   │   └── README.md      # Rust setup instructions
│   │   └── wasm/              # WebAssembly benchmarks (stub)
│   │       └── README.md      # WASM setup instructions
│   ├── utils/
│   │   └── formatter.js        # Result formatting utilities
│   └── cli.js                  # CLI runner
├── src/                        # React app source
│   ├── index.js                # React entry point
│   ├── App.js                  # Main React component
│   └── components/
│       ├── Header.js           # Header component
│       ├── BenchmarkRunner.js  # Benchmark controls
│       └── HallwayVisualization.js  # Canvas visualization
├── public/
│   └── index.html              # HTML entry point
├── package.json
└── README.md
```

## 🔧 Technology Stack

- **Frontend**: React 18, Canvas API for visualization
- **Backend/CLI**: Node.js, Commander.js for CLI
- **Benchmarking**: Benchmark.js
- **Styling**: CSS3 with modern effects (backdrop-filter, gradients)
- **Future**: Three.js/WebGL for 3D visualization

## 🦀 Rust Integration (Future)

The project includes stubs for Rust benchmarks. To implement:

1. Follow instructions in `src/benchmarks/rust/README.md`
2. Install Rust and wasm-pack
3. Create Rust implementations of benchmarks
4. Compile to WebAssembly
5. Integrate with JavaScript runner

## 🌐 WebAssembly Integration (Future)

WASM benchmarks can be added by:

1. See `src/benchmarks/wasm/README.md` for detailed instructions
2. Create WASM modules from C/C++, Rust, or AssemblyScript
3. Add loading utilities in the benchmark runner
4. Compare performance with JavaScript implementations

## 📈 Output Format

Benchmark results include:

```json
{
  "timestamp": "2024-01-08T12:00:00.000Z",
  "benchmarks": {
    "cpu": [
      {
        "name": "Fibonacci(20)",
        "opsPerSec": 125000,
        "stats": {
          "mean": 0.000008,
          "deviation": 0.0000002,
          "margin": 2.5
        }
      }
    ]
  }
}
```

## 🤝 Contributing

Contributions welcome! Areas for expansion:

- Additional benchmark implementations
- Rust/WASM integration
- 3D visualization with Three.js
- Performance comparison tools
- More comprehensive test suites

## 📄 License

MIT

## 🎯 Roadmap

- [x] Basic JavaScript benchmarks
- [x] CLI runner
- [x] React web UI
- [x] 2D/Perspective canvas visualization
- [ ] Rust benchmark implementations
- [ ] WebAssembly module integration
- [ ] Full 3D hallway with Three.js
- [ ] Real-time streaming results
- [ ] Historical benchmark tracking
- [ ] Comparison dashboard
