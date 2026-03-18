// snapshotManager.js
// Save, load, and diff benchmark result snapshots.
// Used to track performance changes when compilers are upgraded or configs change.

const STORAGE_KEY = 'benching_machine_snapshot';

/**
 * Persist benchmarkData to localStorage and optionally trigger a JSON download.
 * @param {object} benchmarkData  – { timestamp, configurations: Config[] }
 * @param {boolean} download      – if true, also triggers a file download
 */
export function saveSnapshot(benchmarkData, download = false) {
  if (!benchmarkData) return;
  const payload = JSON.stringify(benchmarkData, null, 2);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    console.warn('snapshotManager: localStorage write failed', e);
  }

  if (download) {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bench-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Load the most-recently saved snapshot from localStorage.
 * @returns {object|null}  benchmarkData or null if nothing saved
 */
export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('snapshotManager: failed to parse snapshot', e);
    return null;
  }
}

/**
 * Load a snapshot from a JSON file selected by the user.
 * Returns a Promise that resolves with the parsed benchmarkData.
 * @returns {Promise<object>}
 */
export function loadSnapshotFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * Compare two sets of configurations and return per-config per-test deltas.
 *
 * Returns an object keyed by configId:
 * {
 *   [configId]: {
 *     '__avg__': { delta, pct },       // avg ops/sec delta
 *     [testName]: { delta, pct },      // per-test ops/sec delta
 *   }
 * }
 *
 * delta = current - baseline (positive = improvement)
 * pct   = (delta / baseline) * 100
 *
 * @param {Config[]} baselineConfigs   – from the saved snapshot
 * @param {Config[]} currentConfigs    – from the current run
 * @returns {object}
 */
export function diffSnapshots(baselineConfigs, currentConfigs) {
  if (!baselineConfigs || !currentConfigs) return {};

  const baselineMap = {};
  baselineConfigs.forEach(c => { baselineMap[c.id] = c; });

  const result = {};

  currentConfigs.forEach(current => {
    const baseline = baselineMap[current.id];
    if (!baseline || !baseline.tests || !current.tests) return;

    const configDiff = {};

    // Per-test deltas
    current.tests.forEach(curTest => {
      const baseTest = baseline.tests.find(t => t.name === curTest.name);
      if (!baseTest) return;
      const delta = curTest.opsPerSec - baseTest.opsPerSec;
      const pct   = baseTest.opsPerSec !== 0 ? (delta / baseTest.opsPerSec) * 100 : 0;
      configDiff[curTest.name] = { delta, pct };
    });

    // Average delta
    const sharedTests = current.tests.filter(ct =>
      baseline.tests.some(bt => bt.name === ct.name)
    );
    if (sharedTests.length > 0) {
      const avgCur  = sharedTests.reduce((s, t) => s + t.opsPerSec, 0) / sharedTests.length;
      const avgBase = sharedTests.reduce((s, ct) => {
        const bt = baseline.tests.find(t => t.name === ct.name);
        return s + (bt ? bt.opsPerSec : 0);
      }, 0) / sharedTests.length;
      const delta = avgCur - avgBase;
      const pct   = avgBase !== 0 ? (delta / avgBase) * 100 : 0;
      configDiff['__avg__'] = { delta, pct };
    }

    result[current.id] = configDiff;
  });

  return result;
}
