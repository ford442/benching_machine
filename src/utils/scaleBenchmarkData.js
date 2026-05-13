/**
 * Scale benchmark results to simulate cross-machine performance.
 *
 * Applies a machine profile's base multiplier AND per-architecture
 * family multipliers so that GPU workloads don't magically speed up
 * on a CPU-centric machine (and vice-versa).
 *
 * @param {object} benchmarkData – { timestamp, configurations: Config[] }
 * @param {object} profile       – machineProfile entry
 * @returns {object}             – deep-cloned benchmarkData with scaled opsPerSec
 */
export function scaleBenchmarkData(benchmarkData, profile) {
  if (!benchmarkData || !profile) return benchmarkData;

  // Deep clone so we don't mutate the original snapshot/live data
  const scaled = JSON.parse(JSON.stringify(benchmarkData));

  scaled.configurations.forEach((config) => {
    const family = config.compilation?.family || 'js';
    const familyMult = profile.familyMultipliers?.[family] ?? 1.0;
    const totalMult = profile.multiplier * familyMult;

    if (config.tests) {
      config.tests.forEach((test) => {
        test.opsPerSec = (test.opsPerSec || 0) * totalMult;
        if (test.avgOpsPerSec !== undefined) {
          test.avgOpsPerSec = test.avgOpsPerSec * totalMult;
        }
      });
    }
  });

  // Stamp the profile so consumers can tell this is simulated
  scaled.machineProfile = profile.id;

  return scaled;
}

/**
 * Compute the total simulated score for a single config under a profile.
 * Useful for sorting or summary cards.
 */
export function getSimulatedScore(config, profile) {
  if (!config.tests || !profile) return 0;
  const family = config.compilation?.family || 'js';
  const familyMult = profile.familyMultipliers?.[family] ?? 1.0;
  const totalMult = profile.multiplier * familyMult;
  return config.tests.reduce((sum, t) => sum + (t.opsPerSec || 0) * totalMult, 0);
}
