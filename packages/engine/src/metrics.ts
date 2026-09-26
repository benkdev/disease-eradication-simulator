/**
 * Recompute derived metrics from the current simulation state.
 * Used by step 13 and by the UI for display.
 */

import type { SimState } from './init.js';
import { BASELINE_LE } from './catalog.js';

export interface Metrics {
  /** Counts per stage [0..4] */
  counts: [number, number, number, number, number];
  /** Total burden across all discovered diseases */
  totalBurden: number;
  /** Averted burden (rollout = 0.5, eradicated = 1.0) */
  avertedBurden: number;
  /** Diseases in stages 1-3 */
  remaining: number;
  /** Diseases in stage 4 */
  eradCum: number;
}

/**
 * Compute burden and stage counts, applying the aging multiplier
 * for chronic and neuro diseases (types 2 and 3).
 * Uses state.LE and state.agingGain as of the moment of call.
 */
export function recompute(state: SimState): Metrics {
  const ageMult = 1 + 0.03
    * Math.max(0, state.LE - BASELINE_LE - state.agingGain)
    * Math.max(0, 1 - state.agingGain / 10);

  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let totalBurden = 0;
  let avertedBurden = 0;

  for (let i = 0; i < state.N; i++) {
    const s = state.stage[i];
    counts[s]++;

    if (s >= 1) {
      const mi = (state.type[i] === 2 || state.type[i] === 3) ? ageMult : 1;
      const b = state.burden[i] * mi;
      totalBurden += b;

      if (s === 3) {
        avertedBurden += 0.5 * b;
      } else if (s === 4) {
        avertedBurden += b;
      }
    }
  }

  const remaining = counts[1] + counts[2] + counts[3];
  const eradCum = counts[4];

  return { counts, totalBurden, avertedBurden, remaining, eradCum };
}
