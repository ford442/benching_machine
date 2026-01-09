const CPUBenchmark = require('./cpu');
const MemoryBenchmark = require('./memory');
const CompilationBenchmark = require('./compilation');
const GPUBenchmark = require('./gpu');

module.exports = {
  CPUBenchmark,
  MemoryBenchmark,
  CompilationBenchmark,
  GPUBenchmark
};
