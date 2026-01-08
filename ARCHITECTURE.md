# Architecture Documentation

## Overview

Benching Machine is a modular benchmarking tool designed to compare performance across JavaScript, Rust, and WebAssembly. The application is split into two main components:

1. **Backend (CLI)**: Node.js-based benchmark runner
2. **Frontend (Web UI)**: React-based visualization

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Benching Machine                        │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                   │
│   Backend (CLI)         │    Frontend (Web UI)              │
│   ├─ Node.js            │    ├─ React 18                    │
│   ├─ Benchmark.js       │    ├─ Canvas API                  │
│   ├─ Commander.js       │    └─ CSS3 Effects                │
│   └─ Chalk              │                                   │
│                         │                                   │
│   Benchmark Modules:    │    Components:                    │
│   ├─ CPU                │    ├─ Header                      │
│   ├─ Memory             │    ├─ BenchmarkRunner             │
│   ├─ Compilation        │    └─ HallwayVisualization        │
│   ├─ Rust (stub)        │                                   │
│   └─ WASM (stub)        │    Visualization Modes:           │
│                         │    ├─ 2D View                     │
│                         │    └─ Perspective View            │
└─────────────────────────┴───────────────────────────────────┘
```

## Component Design

### Backend Architecture

#### 1. Benchmark Modules (`backend/benchmarks/`)

Each benchmark module is a class with:
- **Constructor**: Initializes Benchmark.js suite
- **Test Methods**: Implementations of specific tests
- **run()**: Async method that executes all tests
- **getResults()**: Returns formatted results

**Example Structure**:
```javascript
class CPUBenchmark {
  constructor() {
    this.suite = new Benchmark.Suite('CPU');
    this.results = [];
  }

  fibonacci(n) { /* implementation */ }
  
  async run() {
    return new Promise((resolve) => {
      this.suite
        .add('Test Name', () => { /* test */ })
        .on('cycle', (event) => { /* collect results */ })
        .on('complete', () => resolve(this.results))
        .run({ async: true });
    });
  }
}
```

#### 2. CLI Runner (`backend/cli.js`)

Uses Commander.js to provide:
- **run** command: Execute benchmarks
- **list** command: Show available benchmarks
- Options for selective execution
- Results export functionality

#### 3. Formatter Utilities (`backend/utils/formatter.js`)

Provides functions for:
- Console output formatting with colors
- Number formatting (commas, decimals)
- Results serialization (JSON)
- Future: Results comparison

### Frontend Architecture

#### 1. React Application Structure

```
App
├─ Header (static header with branding)
├─ BenchmarkRunner (controls sidebar)
│  ├─ Run button
│  ├─ Progress status
│  └─ Info section
└─ HallwayVisualization (main canvas)
   ├─ View controls (2D/Perspective toggle)
   └─ Canvas rendering loop
```

#### 2. Visualization System

**Canvas Rendering Pipeline**:
1. **Initialize**: Set up canvas context and event listeners
2. **Animation Loop**: RequestAnimationFrame for smooth rendering
3. **Draw Sequence**:
   - Clear canvas
   - Draw background
   - Draw rack frames (server cabinets)
   - Draw benchmark bars (animated gradients)
   - Draw text labels and values
   - Draw LEDs and decorations

**View Modes**:

- **2D View**: Side-by-side racks with flat perspective
  - Each rack represents one benchmark category
  - Bars show individual test results
  - Full details visible
  
- **Perspective View**: Depth-based rendering
  - Vanishing point for 3D effect
  - Racks positioned in depth
  - Preview of future 3D navigation

#### 3. State Management

Simple React state using hooks:
- `benchmarkData`: Results from benchmark execution
- `isRunning`: Tracks if benchmarks are currently executing
- `viewMode`: Toggle between 2D and Perspective
- `progress`: Status messages during execution

## Data Flow

### CLI Execution Flow

```
User Command
    ↓
Commander Parse
    ↓
Benchmark Selection
    ↓
Execute Benchmarks (parallel/sequential)
    ↓
Collect Results
    ↓
Format Output
    ↓
Display & Optional Export
```

### Web UI Flow

```
User Click "Run"
    ↓
Set isRunning = true
    ↓
Execute Mock Benchmarks (simulated async)
    ↓
Update Progress Messages
    ↓
Collect Results
    ↓
Set benchmarkData
    ↓
Canvas Re-renders
    ↓
Animated Visualization
```

## Performance Considerations

### CLI
- Uses Benchmark.js for statistical accuracy
- Runs multiple iterations to get stable results
- Measures garbage collection impact
- Reports deviation and margin of error

### Web UI
- Canvas-based for 60fps animations
- RequestAnimationFrame for optimal rendering
- Minimal re-renders (React optimization)
- Mock data to avoid blocking the UI thread

## Extensibility

### Adding New Benchmarks

1. Create new benchmark class in `backend/benchmarks/`
2. Export from `backend/benchmarks/index.js`
3. Add to CLI runner in `backend/cli.js`
4. Update visualization to handle new category

### Integrating Rust/WASM

1. Follow setup guides in `backend/benchmarks/rust/` or `wasm/`
2. Compile to WebAssembly
3. Create JavaScript wrapper
4. Add to benchmark modules
5. Compare results with pure JS implementations

### Future 3D Visualization

Current Canvas implementation provides foundation:
- Replace Canvas with Three.js scene
- Convert 2D rack coordinates to 3D positions
- Add camera controls (orbit, pan, zoom)
- Implement interactive rack selection
- Add particle effects and advanced shaders

## Technology Choices

### Backend
- **Node.js**: Cross-platform, JavaScript consistency
- **Benchmark.js**: Industry-standard benchmarking library
- **Commander.js**: Rich CLI with minimal boilerplate
- **Chalk**: Beautiful terminal output

### Frontend
- **React**: Component-based, excellent ecosystem
- **Canvas API**: Hardware-accelerated, 60fps rendering
- **react-scripts**: Zero-config build setup
- **CSS3**: Modern effects (backdrop-filter, gradients)

### Future
- **Three.js**: 3D rendering for hallway navigation
- **WebGL**: Low-level graphics for custom effects
- **Web Workers**: Off-main-thread benchmark execution
- **WebAssembly**: High-performance computing

## Security Considerations

- No external API calls (local execution only)
- No user data collection
- Sandbox execution for benchmarks
- Input validation in CLI

## Testing Strategy

Current: Manual verification
Future:
- Unit tests for benchmark modules
- Integration tests for CLI
- Component tests for React UI
- E2E tests for full workflow
- Performance regression tests

## Deployment

### Development
```bash
npm install
npm run bench      # CLI
npm run web        # Web UI
```

### Production Build
```bash
npm run build      # Creates optimized production build
```

Output in `build/` directory can be served statically.

## Monitoring & Observability

Future enhancements:
- Benchmark history tracking
- Performance regression detection
- Comparison with previous runs
- Export to standard formats (JSON, CSV)
- Integration with CI/CD pipelines
