# Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Try the CLI

Run all benchmarks:
```bash
npm run bench
```

Or run specific categories:
```bash
npm run bench -- run --cpu          # CPU benchmarks only
npm run bench -- run --memory       # Memory benchmarks only
npm run bench -- run --compilation  # Compilation benchmarks only
```

List available benchmarks:
```bash
npm run bench -- list
```

### 3. Launch the Web UI

```bash
npm run web
```

Then open your browser to `http://localhost:3000`

## 🎯 What You'll See

### CLI Output
- Real-time benchmark execution
- Operations per second metrics
- Memory usage statistics
- Beautiful colored console output

### Web UI
- **Header**: Project title and tech stack badges
- **Benchmark Controls**: Run benchmarks with one click
- **Hallway Visualization**: Three server racks representing CPU, Memory, and Compilation benchmarks
- **2D View**: Flat view of all racks with animated bars
- **Perspective View**: Depth-based preview of future 3D features

## 📊 Understanding Results

Each benchmark shows:
- **Name**: What is being tested
- **Operations/sec**: Higher is better
- **Deviation**: Lower means more consistent
- **Margin**: Relative error percentage
- **Memory**: Heap usage (for memory benchmarks)

## 🔧 Next Steps

1. **Explore the code**: Check `backend/benchmarks/` for JavaScript implementations
2. **Add Rust benchmarks**: Follow `backend/benchmarks/rust/README.md`
3. **Add WASM modules**: Follow `backend/benchmarks/wasm/README.md`
4. **Customize UI**: Modify React components in `src/components/`
5. **Export results**: Use `--output results.json` to save benchmark data

## 💡 Tips

- The web UI uses mock data that changes slightly each run to simulate realistic performance
- The CLI runs actual benchmarks with real performance measurements
- Both views support the same benchmark categories
- Try switching between 2D and Perspective views in the web UI

## 🐛 Troubleshooting

**CLI not found?**
```bash
node backend/cli.js run
```

**Web UI won't start?**
- Make sure port 3000 is available
- Try `npm install` again if you see dependency errors

**Benchmarks too slow?**
- This is expected! Benchmarks need time to get accurate measurements
- CPU benchmarks: ~10-15 seconds
- Memory benchmarks: ~15-20 seconds
- Compilation benchmarks: ~10-15 seconds

## 📚 Learn More

See the main [README.md](README.md) for complete documentation including:
- Architecture details
- Technology stack
- Project structure
- Contributing guidelines
- Roadmap for future features
