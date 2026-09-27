/**
 * Public API for the simulation engine.
 * Re-exports everything needed by the web app, API server, and tests.
 */

export { RNG, mulberry32 } from './rng.js';
export { fmtBig, fmtNum } from './format.js';
export {
  TYPE_INFO,
  FAMILIES,
  NAMED_DISEASES,
  DISEASE_NAMES,
  TOTAL_BURDEN,
  BASELINE_LE,
  LE_GAIN_CAP,
  PANDEMIC_RESERVE,
  START_YEAR,
  END_YEAR,
  MAX_EVENTS,
  TOTAL_FAMILIES,
  TOTAL_KNOWN,
  A_EXT,
  A_DIS,
  G0,
  B_INT,
  D_AGE,
  lifeExp,
  solveGmin,
} from './catalog.js';
export type { TypeInfo, FamilyInfo, NamedDiseaseInfo } from './catalog.js';
export {
  DEFAULTS,
  PARAM_RANGES,
  GROWTH_PRESETS,
  PRIORITY_LABELS,
  ENGINE_VERSION,
} from './params.js';
export type { Params, YearRecord, EventEntry, RunSummary, ParamRange } from './params.js';
export { createSim } from './init.js';
export type { SimState } from './init.js';
export { step } from './step.js';
export { recompute } from './metrics.js';
export type { Metrics } from './metrics.js';

import { createSim } from './init.js';
import { step } from './step.js';
import type { Params, RunSummary } from './params.js';
import type { SimState } from './init.js';

/**
 * Run a complete simulation from params to end. Returns the summary.
 */
export function runToEnd(params: Params): RunSummary {
  const state = createSim(params);
  while (!state.done) {
    step(state);
  }
  return summarize(state);
}

/**
 * Extract a RunSummary from a completed (or in-progress) simulation state.
 */
export function summarize(state: SimState): RunSummary {
  const lastRec = state.hist[state.hist.length - 1];

  let outcome: RunSummary['outcome'];
  if (state.fullYear !== null) {
    outcome = 'full';
  } else if (state.crossYear !== null) {
    outcome = 'crossover';
  } else {
    outcome = 'timeout';
  }

  return {
    seed: state.params.seed,
    outcome,
    endYear: state.year,
    crossYear: state.crossYear,
    levYear: state.levYear,
    fullYear: state.fullYear,
    eradicated: lastRec.eradCum,
    remaining: lastRec.rem,
    healthyYears: Math.round(state.healthyYears),
    lifeExpectancy: state.LE,
    pandemics: state.pandemics,
    platforms: state.platforms,
    safetyScares: state.safetyScares,
    resistanceEvents: state.resistanceEvents,
    plateauCount: state.plateaus.length,
    finalCapability: state.C,
  };
}
