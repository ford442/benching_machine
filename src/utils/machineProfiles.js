/**
 * Cross-machine hardware profiles for frontend playback comparison.
 * Data is generated from shared/benchmark-registry.json (single source of
 * truth shared with the backend) — see scripts/generate-benchmark-config.js.
 */

import { machineProfiles } from '../generated/benchmarkRegistry';

export { machineProfiles };

/** Ordered list for dropdowns / selectors. */
export const machineProfileList = Object.values(machineProfiles);

/** Get a profile by its id. */
export function getMachineProfile(id) {
  return machineProfiles[id] || machineProfiles.reference;
}
