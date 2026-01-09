#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { CPUBenchmark, MemoryBenchmark, CompilationBenchmark, GPUBenchmark } = require('./benchmarks');
const { formatResults, saveResults } = require('./utils/formatter');

program
  .name('benching-machine')
  .description('Benchmarking tool comparing JavaScript, Rust, and WebAssembly performance')
  .version('1.0.0');

program
  .command('run')
  .description('Run all benchmarks')
  .option('-c, --cpu', 'Run only CPU benchmarks')
  .option('-m, --memory', 'Run only memory benchmarks')
  .option('-t, --compilation', 'Run only compilation benchmarks')
  .option('-g, --gpu', 'Run only GPU benchmarks (CPU implementations)')
  .option('-o, --output <file>', 'Save results to file')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🚀 Benching Machine - Performance Benchmark Suite\n'));

    const results = {
      timestamp: new Date().toISOString(),
      benchmarks: {}
    };

    try {
      // Determine which benchmarks to run
      const runAll = !options.cpu && !options.memory && !options.compilation && !options.gpu;

      if (runAll || options.cpu) {
        console.log(chalk.yellow('⚙️  Running CPU benchmarks...\n'));
        const cpuBench = new CPUBenchmark();
        const cpuResults = await cpuBench.run();
        results.benchmarks.cpu = cpuResults;
        formatResults('CPU', cpuResults);
      }

      if (runAll || options.memory) {
        console.log(chalk.yellow('\n💾 Running Memory benchmarks...\n'));
        const memoryBench = new MemoryBenchmark();
        const memoryResults = await memoryBench.run();
        results.benchmarks.memory = memoryResults;
        formatResults('Memory', memoryResults);
      }

      if (runAll || options.compilation) {
        console.log(chalk.yellow('\n⏱️  Running Compilation benchmarks...\n'));
        const compilationBench = new CompilationBenchmark();
        const compilationResults = await compilationBench.run();
        results.benchmarks.compilation = compilationResults;
        formatResults('Compilation', compilationResults);
      }

      if (runAll || options.gpu) {
        console.log(chalk.yellow('\n🎮 Running GPU benchmarks (CPU implementations)...\n'));
        const gpuBench = new GPUBenchmark();
        const gpuResults = await gpuBench.run();
        results.benchmarks.gpu = gpuResults;
        formatResults('GPU', gpuResults);
      }

      // Save results if output file specified
      if (options.output) {
        saveResults(results, options.output);
        console.log(chalk.green(`\n✅ Results saved to ${options.output}`));
      }

      console.log(chalk.blue.bold('\n✨ All benchmarks completed!\n'));
      console.log(chalk.gray('Tip: Run with --output results.json to save results'));
      console.log(chalk.gray('Tip: Start the web UI with: npm run web\n'));

    } catch (error) {
      console.error(chalk.red('\n❌ Error running benchmarks:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available benchmarks')
  .action(() => {
    console.log(chalk.blue.bold('\n📋 Available Benchmarks:\n'));
    
    console.log(chalk.yellow('CPU Benchmarks:'));
    console.log('  - Fibonacci(20): Recursive calculation');
    console.log('  - Prime Check: Test 10,000 numbers for primality');
    console.log('  - Matrix Multiply: 10x10 matrix multiplication');
    
    console.log(chalk.yellow('\nMemory Benchmarks:'));
    console.log('  - Array Operations: 10k element array manipulation');
    console.log('  - Object Creation: Create 1k objects');
    console.log('  - String Concatenation: 1k string operations');
    console.log('  - Typed Array Operations: 10k element typed array');
    
    console.log(chalk.yellow('\nCompilation Benchmarks:'));
    console.log('  - Regular Function: 10k function calls');
    console.log('  - Arrow vs Regular: Compare function types');
    console.log('  - Dynamic Function Creation: Runtime function generation');
    console.log('  - WASM Compilation: Simulate WebAssembly compilation');
    
    console.log(chalk.yellow('\nGPU Benchmarks:'));
    console.log('  - Matrix Multiply CPU: 256x256 matrix multiplication (baseline)');
    console.log('  - Particle Simulation CPU: 1000 particles simulation');
    console.log('  - Image Convolution CPU: 512x512 convolution filter');
    console.log('  - Ray Marching CPU: 256x256 ray marching');
    console.log('  (Use web UI for WebGL/WebGPU accelerated versions)');
    
    console.log(chalk.gray('\nRun benchmarks with: npm run bench\n'));
  });

program.parse();
