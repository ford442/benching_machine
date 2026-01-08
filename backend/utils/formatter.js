const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

/**
 * Format benchmark results for console output
 */
function formatResults(category, results) {
  console.log(chalk.cyan(`\n${category} Benchmark Results:`));
  console.log(chalk.gray('─'.repeat(80)));

  results.forEach((result, index) => {
    console.log(chalk.white(`\n${index + 1}. ${result.name}`));
    console.log(chalk.green(`   ✓ Operations/sec: ${formatNumber(result.opsPerSec)}`));
    console.log(chalk.gray(`   ± ${result.stats.margin.toFixed(2)}% (${result.stats.deviation.toFixed(8)}s deviation)`));
    
    if (result.memory) {
      const heapUsedMB = (result.memory.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (result.memory.heapTotal / 1024 / 1024).toFixed(2);
      console.log(chalk.blue(`   📊 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB`));
    }
  });

  console.log(chalk.gray('\n' + '─'.repeat(80)));
}

/**
 * Format large numbers with commas
 */
function formatNumber(num) {
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Save results to JSON file
 */
function saveResults(results, filename) {
  const outputPath = path.resolve(process.cwd(), filename);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
}

/**
 * Load results from JSON file
 */
function loadResults(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filename}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Generate comparison report between two benchmark runs
 */
function compareResults(results1, results2) {
  const comparison = {
    timestamp1: results1.timestamp,
    timestamp2: results2.timestamp,
    differences: {}
  };

  // Compare each category
  for (const category in results1.benchmarks) {
    if (results2.benchmarks[category]) {
      comparison.differences[category] = [];
      
      results1.benchmarks[category].forEach((bench1, index) => {
        const bench2 = results2.benchmarks[category][index];
        if (bench2) {
          const diff = ((bench2.opsPerSec - bench1.opsPerSec) / bench1.opsPerSec) * 100;
          comparison.differences[category].push({
            name: bench1.name,
            opsPerSec1: bench1.opsPerSec,
            opsPerSec2: bench2.opsPerSec,
            percentChange: diff
          });
        }
      });
    }
  }

  return comparison;
}

module.exports = {
  formatResults,
  formatNumber,
  saveResults,
  loadResults,
  compareResults
};
