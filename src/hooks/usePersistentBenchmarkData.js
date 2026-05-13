import { useState, useCallback } from 'react';

const STORAGE_KEY = 'benching_machine_live_data';

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * benchmarkData state that auto-persists to localStorage so results
 * survive page refreshes.
 *
 * @returns {[object | null, (data: object | null) => void]}
 */
export function usePersistentBenchmarkData() {
  const [benchmarkData, setBenchmarkData] = useState(loadInitial);

  const setAndPersist = useCallback((data) => {
    setBenchmarkData(data);
    if (data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to persist benchmark data:', e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return [benchmarkData, setAndPersist];
}
