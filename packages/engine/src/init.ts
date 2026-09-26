/**
 * Simulation initialization: createSim(params) -> SimState.
 * Follows Section 3 initialization order exactly. Draw order is normative.
 */

import { RNG } from './rng.js';
import {
  TYPE_INFO, FAMILIES, NAMED_DISEASES, TOTAL_BURDEN, BASELINE_LE,
  PANDEMIC_RESERVE, START_YEAR, TOTAL_KNOWN, TOTAL_FAMILIES, MAX_EVENTS,
  G0, solveGmin,
} from './catalog.js';
import type { Params, YearRecord, EventEntry } from './params.js';
import { fmtNum } from './format.js';
import { recompute } from './metrics.js';

// ── SimState ─────────────────────────────────────────────────────────────────

export interface SimState {
  params: Params;
  rng: RNG;
  year: number;
  C: number;
  reg: number;
  LE: number;
  LEdis: number;
  G: number;
  Q: number;
  Gmin: number;
  O: number;
  H: number;
  O0: number;
  H0: number;
  agingGain: number;
  diversion: number;
  poolLeft: number;
  accDet: number;

  // Plateau state (waves growth)
  K: number;
  plLeft: number;
  plateaus: [number, number | null][];

  // Disease parallel arrays
  N: number;
  type: Uint8Array;
  fam: Uint8Array;
  stage: Uint8Array;
  kind: Uint8Array;
  prog: Float64Array;
  diff: Float64Array;
  burden: Float64Array;
  timer: Float64Array;
  nameIdx: Int16Array;

  // Display order
  displayOrder: number[];

  // History
  hist: YearRecord[];
  events: EventEntry[];

  // Tracking
  done: boolean;
  crossYear: number | null;
  levYear: number | null;
  fullYear: number | null;
  pandemics: number;
  platforms: number;
  safetyScares: number;
  resistanceEvents: number;
  healthyYears: number;
  lastPoliticalEventYear: number;
  lastMilestone: number;
  usedFamilies: boolean[];
  escapeVelocityReached: boolean;
}

// ── pickFam: draw a family within a type, skewed toward first families ────────

function pickFam(rng: RNG, typeIdx: number): number {
  const ti = TYPE_INFO[typeIdx];
  const nf = ti.familyCount;
  const u = rng.uniform();
  const localIdx = Math.min(nf - 1, Math.floor(nf * Math.pow(u, 1.4)));
  return ti.familyStartIdx + localIdx;
}

// ── createSim ────────────────────────────────────────────────────────────────

export function createSim(params: Params): SimState {
  // Resolve seed
  let seed = params.seed;
  if (seed === 0) {
    seed = Math.floor(Math.random() * 1000000) + 1;
  }
  const resolvedParams: Params = { ...params, seed };

  const rng = new RNG(seed);

  // Total disease count
  const N = TOTAL_KNOWN + resolvedParams.pool + PANDEMIC_RESERVE;

  // Allocate parallel typed arrays
  const type = new Uint8Array(N);
  const fam = new Uint8Array(N);
  const stage = new Uint8Array(N);
  const kind = new Uint8Array(N);
  const prog = new Float64Array(N);
  const diff = new Float64Array(N);
  const burden = new Float64Array(N);
  const timer = new Float64Array(N);
  const nameIdx = new Int16Array(N).fill(-1);

  let idx = 0;

  // Per-type trackers for named diseases
  const namedBurden = new Float64Array(6);
  const namedCount = new Uint32Array(6);

  // ── Step 1: Create 33 named diseases at indices 0-32 ───────────────────────

  for (let i = 0; i < NAMED_DISEASES.length; i++) {
    const nd = NAMED_DISEASES[i];
    type[idx] = nd.typeIdx;
    fam[idx] = nd.familyGlobalIdx;
    stage[idx] = 1;
    kind[idx] = 0;
    prog[idx] = 0;
    diff[idx] = nd.difficulty;
    burden[idx] = nd.burden;
    timer[idx] = 0;
    nameIdx[idx] = i;
    namedBurden[nd.typeIdx] += nd.burden;
    namedCount[nd.typeIdx]++;
    idx++;
  }

  // ── Step 2: For each type, create remaining generic known diseases ─────────

  for (let t = 0; t < 6; t++) {
    const ti = TYPE_INFO[t];
    const n = ti.known - namedCount[t];
    if (n <= 0) continue;

    // First draw all n Zipf weights
    const weights = new Float64Array(n);
    let sumW = 0;
    for (let i = 0; i < n; i++) {
      const u = rng.uniform();
      weights[i] = (0.5 + u) / Math.pow(i + 1, 1.15);
      sumW += weights[i];
    }

    // Remaining burden for this type
    const Rt = ti.burdenShare * TOTAL_BURDEN - namedBurden[t];

    // Create diseases. Per disease: family draw, then difficulty (gauss).
    for (let i = 0; i < n; i++) {
      const b = Math.max(50, Rt * weights[i] / sumW);
      const famIdx = pickFam(rng, t);
      const z = rng.gauss();
      const d = Math.max(1, ti.medianDiff * Math.exp(1.0 * z));

      type[idx] = t;
      fam[idx] = famIdx;
      stage[idx] = 1;
      kind[idx] = 0;
      prog[idx] = 0;
      diff[idx] = d;
      burden[idx] = b;
      timer[idx] = 0;
      nameIdx[idx] = -1;
      idx++;
    }
  }

  // ── Step 3: Create undiscovered pool ───────────────────────────────────────

  for (let i = 0; i < resolvedParams.pool; i++) {
    const u = rng.uniform();
    let t: number;
    if (u < 0.8) t = 1;       // Genetic and rare
    else if (u < 0.9) t = 0;  // Infectious
    else t = 5;                // Other

    const famIdx = pickFam(rng, t);
    const z1 = rng.gauss();
    const b = 2000 * Math.exp(1.2 * z1);
    const z2 = rng.gauss();
    const d = Math.max(1, 0.8 * TYPE_INFO[t].medianDiff * Math.exp(0.7 * z2));

    type[idx] = t;
    fam[idx] = famIdx;
    stage[idx] = 0;
    kind[idx] = 1;
    prog[idx] = 0;
    diff[idx] = d;
    burden[idx] = b;
    timer[idx] = 0;
    nameIdx[idx] = -1;
    idx++;
  }

  // ── Step 4: Create 150 pandemic reserve slots ─────────────────────────────

  for (let i = 0; i < PANDEMIC_RESERVE; i++) {
    const u = rng.uniform();
    const famIdx = u < 0.7 ? 0 : 1; // respiratory virus or hemorrhagic and arboviral

    type[idx] = 0; // Infectious
    fam[idx] = famIdx;
    stage[idx] = 0;
    kind[idx] = 2;
    prog[idx] = 0;
    diff[idx] = 8;
    burden[idx] = 0;
    timer[idx] = 0;
    nameIdx[idx] = -1;
    idx++;
  }

  // ── Step 5: Head start for known diseases ─────────────────────────────────

  for (let i = 0; i < TOTAL_KNOWN; i++) {
    const u = rng.uniform();
    prog[i] = diff[i] * 0.85 * Math.pow(u, 1.5);

    const q = rng.uniform();
    if (q < 0.03) {
      stage[i] = 2; // clinical trials
      const u2 = rng.uniform();
      timer[i] = 1 + 7 * u2;
    } else if (q < 0.036) {
      stage[i] = 3; // global rollout
      const u2 = rng.uniform();
      timer[i] = 1 + 7 * u2;
    }
  }

  // ── Step 6: Force Measles (index 20) to stage 3 with timer 4 ─────────────

  stage[20] = 3;
  timer[20] = 4;

  // ── Step 7: Compute display order ─────────────────────────────────────────

  const displayOrder = Array.from({ length: N }, (_, i) => i);

  // Fisher-Yates shuffle
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng.uniform() * (i + 1));
    const tmp = displayOrder[i];
    displayOrder[i] = displayOrder[j];
    displayOrder[j] = tmp;
  }

  // Stable sort by family, then by diff / (1 + log10(burden + 10))
  displayOrder.sort((a, b) => {
    if (fam[a] !== fam[b]) return fam[a] - fam[b];
    const scoreA = diff[a] / (1 + Math.log10(burden[a] + 10));
    const scoreB = diff[b] / (1 + Math.log10(burden[b] + 10));
    return scoreA - scoreB;
  });

  // ── Step 8: Initial state ─────────────────────────────────────────────────

  const reg = resolvedParams.reg0 / 100;
  const D0 = resolvedParams.human + resolvedParams.aiBase;

  // Count initial stages
  let rem = 0;
  let eradCum = 0;
  for (let i = 0; i < N; i++) {
    if (stage[i] >= 1 && stage[i] <= 3) rem++;
    if (stage[i] === 4) eradCum++;
  }

  const firstRecord: YearRecord = {
    y: START_YEAR,
    erad: 0,
    newF: 0,
    LE: BASELINE_LE,
    dLE: 0,
    dAg: 0,
    C: 1,
    reg,
    rem,
    eradCum,
    healthy: 0,
    T: 8,
    p: 0.1,
    D: D0,
  };

  const state: SimState = {
    params: resolvedParams,
    rng,
    year: START_YEAR,
    C: 1,
    reg,
    LE: BASELINE_LE,
    LEdis: 73.3,
    G: G0,
    Q: 0,
    Gmin: solveGmin(resolvedParams.lemax),
    O: 0,
    H: 0,
    O0: 0,
    H0: 0,
    agingGain: 0,
    diversion: 0,
    poolLeft: resolvedParams.pool,
    accDet: 0,
    K: resolvedParams.ceiling,
    plLeft: 0,
    plateaus: [],
    N,
    type,
    fam,
    stage,
    kind,
    prog,
    diff,
    burden,
    timer,
    nameIdx,
    displayOrder,
    hist: [firstRecord],
    events: [{
      year: START_YEAR,
      msg: `Run ${seed} begins with ${fmtNum(TOTAL_KNOWN)} known diseases`,
      kind: 'ai',
    }],
    done: false,
    crossYear: null,
    levYear: null,
    fullYear: null,
    pandemics: 0,
    platforms: 0,
    safetyScares: 0,
    resistanceEvents: 0,
    healthyYears: 0,
    lastPoliticalEventYear: -Infinity,
    lastMilestone: 0,
    usedFamilies: new Array(TOTAL_FAMILIES).fill(false),
    escapeVelocityReached: false,
  };

  recompute(state);
  state.O0 = state.O;
  state.H0 = state.H;

  return state;
}
