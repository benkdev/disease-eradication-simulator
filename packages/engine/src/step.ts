/**
 * step(state): advances the simulation by exactly one year.
 * 14 sub-steps in the order specified by Section 4 of the spec.
 * Random draw order is normative — do not reorder.
 */

import type { SimState } from './init.js';
import type { EventEntry } from './params.js';
import {
  TYPE_INFO, FAMILIES, NAMED_DISEASES, BASELINE_LE,
  START_YEAR, END_YEAR, MAX_EVENTS, TOTAL_FAMILIES,
} from './catalog.js';
import { recompute } from './metrics.js';
import { fmtBig } from './format.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function addEvent(state: SimState, msg: string, kind: EventEntry['kind']): void {
  state.events.unshift({ year: state.year, msg, kind });
  if (state.events.length > MAX_EVENTS) {
    state.events.length = MAX_EVENTS;
  }
}

function getName(state: SimState, i: number): string {
  if (state.nameIdx[i] >= 0) {
    return NAMED_DISEASES[state.nameIdx[i]].name;
  }
  return `a ${FAMILIES[state.fam[i]].name} disease`;
}

// ── step ─────────────────────────────────────────────────────────────────────

export function step(state: SimState): void {
  if (state.done) return;

  const { params, rng, N } = state;
  const t = state.year - START_YEAR; // before incrementing
  const lastRec = state.hist[state.hist.length - 1];
  const eLast = lastRec.erad;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: AI CAPABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  const R = state.reg;
  const MR = R < 0.5 ? 1.25 - 0.5 * R : 1 - 1.3 * (R - 0.5);
  const g = (params.g0 / 100) * Math.pow(1 + params.acc / 100, t) * MR;
  const C_old = state.C;

  if (params.growth === 'exp') {
    state.C = Math.min(1e300, state.C * (1 + g));
  } else {
    // Exponential with plateaus
    if (state.plLeft > 0) {
      // Stalled
      state.C = state.C * (1 + 0.03 * g);
      state.plLeft -= 1;
      if (state.plLeft === 0) {
        const u = rng.uniform();
        state.K = state.C * Math.pow(10, 1 + u);
        // Close current plateau
        const cp = state.plateaus[state.plateaus.length - 1];
        if (cp) {
          const dur = state.year + 1 - cp[0];
          cp[1] = state.year + 1;
          addEvent(state, `Breakthrough after ${dur} years: a new AI paradigm restarts exponential growth`, 'plat');
        }
      }
    } else {
      state.C = state.C * (1 + g);
      if (state.C >= state.K) {
        state.C = state.K;
        const u = rng.uniform();
        state.plLeft = Math.max(1, Math.round(params.plen * (0.5 + u)));
        state.plateaus.push([state.year + 1, null]);
        addEvent(state, `AI progress stalls at ${fmtBig(state.C)}\u00d7 today. A plateau begins`, 'plat');
      }
    }
  }

  // Year increment — all subsequent events use the new year
  state.year += 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: REGULATION FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  const rho = Math.log(state.C / C_old);
  const alarm = Math.max(-0.02, 0.07 * (rho - 0.33));
  const trust = 0.03 * Math.min(1, eLast / 400);

  const uReg = rng.uniform();
  state.reg = Math.max(0, Math.min(1,
    state.reg
    + 0.068 * (params.vol / 100) * (2 * uReg - 1)
    + 0.06 * (params.reg0 / 100 - state.reg)
    + alarm
    - trust
  ));

  // Political events — at most once every 6 years
  if (state.year - state.lastPoliticalEventYear >= 6) {
    if (alarm > 0.03) {
      addEvent(state, 'Public alarm at the pace of AI pushes lawmakers to tighten rules', 'surp');
      state.lastPoliticalEventYear = state.year;
    } else if (trust > 0.02) {
      addEvent(state, 'A wave of cures builds public trust, and regulators ease up', 'surp');
      state.lastPoliticalEventYear = state.year;
    } else if (alarm < -0.01 && state.reg < params.reg0 / 100) {
      addEvent(state, 'AI progress stalls and oversight quietly loosens', 'surp');
      state.lastPoliticalEventYear = state.year;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: PIPELINE SPEED
  // ═══════════════════════════════════════════════════════════════════════════

  const P = Math.log(state.C) / Math.log(10000);
  const c = 1 - Math.exp(-2.2 * Math.max(0, P) * (1 - 0.7 * state.reg));
  const T = 0.4 + 7.6 * (1 - c);
  const p = 0.1 + 0.8 * c;
  const L = 1 + 7 * (1 - c);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: RESEARCH CAPACITY
  // ═══════════════════════════════════════════════════════════════════════════

  let div = 1;
  if (state.diversion > 0) {
    div = 0.7;
    state.diversion -= 1;
  }

  const AI = params.aiBase * state.C * div;
  const D_aging = AI * (params.aging / 100);
  const D = params.human * div + AI * (1 - params.aging / 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: RESEARCH ALLOCATION WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  let gamma: number;
  const typeMults = [1, 1, 1, 1, 1, 1];
  let D_d = D; // effective discoveries for research

  switch (params.priority) {
    case 'killers':
      gamma = 0.8 / (1 + 0.4 * Math.max(0, P));
      break;
    case 'rare':
      gamma = 0;
      typeMults[1] = 4;   // Genetic and rare
      typeMults[2] = 0.6; // Chronic
      typeMults[3] = 0.6; // Neuro and mental
      typeMults[4] = 2;   // Autoimmune
      typeMults[5] = 2;   // Other
      break;
    case 'platforms':
      gamma = 0.5 / (1 + Math.max(0, P));
      D_d = 0.7 * D;
      break;
    case 'aging':
      gamma = 0.5 / (1 + Math.max(0, P));
      break;
  }

  // Total weight W over stage 1 diseases
  let W = 0;
  for (let i = 0; i < N; i++) {
    if (state.stage[i] === 1) {
      W += Math.pow(state.burden[i] + 1, gamma) * typeMults[state.type[i]];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: PIPELINE PASS
  // ═══════════════════════════════════════════════════════════════════════════

  let E = 0; // eradications this year

  for (let i = 0; i < N; i++) {
    const s = state.stage[i];

    if (s === 1) {
      // ── Research ──
      const Wi = Math.pow(state.burden[i] + 1, gamma) * typeMults[state.type[i]];
      const u = rng.uniform();
      state.prog[i] += D_d * (Wi / W) * (0.6 + 0.8 * u);

      if (state.prog[i] >= state.diff[i]) {
        state.stage[i] = 2;
        const u2 = rng.uniform();
        let trialTime = T * (0.7 + 0.6 * u2);
        if (state.type[i] === 1 && params.priority === 'rare') {
          trialTime *= 0.5;
        }
        state.timer[i] = trialTime;
      }
    } else if (s === 2) {
      // ── Clinical trials ──
      state.timer[i] -= 1;
      if (state.timer[i] <= 0) {
        const u = rng.uniform();
        let successProb = p;
        if (state.type[i] === 1 && params.priority === 'rare') {
          successProb += 0.15;
        }
        if (u < successProb) {
          // Success → rollout
          state.stage[i] = 3;
          const u2 = rng.uniform();
          state.timer[i] = L * (0.7 + 0.6 * u2);
        } else {
          // Failure → back to research
          state.stage[i] = 1;
          state.prog[i] = 0.5 * state.diff[i];
        }
      }
    } else if (s === 3) {
      // ── Global rollout ──

      // Infectious diseases: check resistance first
      if (state.type[i] === 0) {
        const u = rng.uniform();
        if (u < (params.res / 100) * (1 - 0.6 * c)) {
          // Resistance: back to research
          state.stage[i] = 1;
          state.prog[i] = 0.6 * state.diff[i];
          state.resistanceEvents++;
          if (state.nameIdx[i] >= 0) {
            addEvent(state, `${NAMED_DISEASES[state.nameIdx[i]].name} develops resistance and returns to research`, 'bad');
          }
          continue;
        }
      }

      // Timer countdown
      state.timer[i] -= 1;
      if (state.timer[i] <= 0) {
        state.stage[i] = 4; // eradicated
        E += 1;
        if (state.nameIdx[i] >= 0) {
          addEvent(state, `${NAMED_DISEASES[state.nameIdx[i]].name} eradicated`, 'win');
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: NEW DISEASE DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  let newF = 0;

  if (state.poolLeft > 0) {
    state.accDet += params.newBase * Math.pow(state.C, params.beta / 100) * (state.poolLeft / params.pool);
    const nNew = Math.min(state.poolLeft, Math.floor(state.accDet));
    state.accDet -= nNew;

    // Build candidate list of pool diseases still at stage 0
    const candidates: number[] = [];
    for (let i = 0; i < N; i++) {
      if (state.kind[i] === 1 && state.stage[i] === 0) {
        candidates.push(i);
      }
    }

    // Pick nNew without replacement (swap-remove)
    for (let j = 0; j < nNew && candidates.length > 0; j++) {
      const u = rng.uniform();
      const q = Math.floor(u * candidates.length);
      const diseaseIdx = candidates[q];
      state.stage[diseaseIdx] = 1;
      // Swap-remove
      candidates[q] = candidates[candidates.length - 1];
      candidates.pop();
    }

    newF = nNew;
    state.poolLeft -= nNew;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: PANDEMIC
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const u = rng.uniform();
    if (u < params.pand / 100) {
      // Find reserve slots still at stage 0
      const reserves: number[] = [];
      for (let i = 0; i < N; i++) {
        if (state.kind[i] === 2 && state.stage[i] === 0) {
          reserves.push(i);
        }
      }

      if (reserves.length > 0) {
        const uPick = rng.uniform();
        const ridx = reserves[Math.floor(uPick * reserves.length)];
        const u1 = rng.uniform();
        const u2 = rng.uniform();
        state.burden[ridx] = (5 + 75 * u1 * u2) * 1e6;
        const u3 = rng.uniform();
        state.diff[ridx] = 6 + 10 * u3;
        state.stage[ridx] = 1;
        newF += 1;
        state.diversion = 2;
        state.reg = Math.max(0, state.reg - 0.2);
        state.pandemics++;

        const famName = FAMILIES[state.fam[ridx]].name;
        addEvent(state, `A novel ${famName} pandemic breaks out. Research is diverted and emergency rules loosen`, 'bad');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9: SAFETY SCARE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const u = rng.uniform();
    const scareProb = 0.25 * (1 - state.reg) * Math.min(1, Math.max(0, P));
    if (u < scareProb) {
      let moved = 0;
      for (let i = 0; i < N && moved < 40; i++) {
        if (state.stage[i] === 3) {
          const u2 = rng.uniform();
          if (u2 < 0.05) {
            state.stage[i] = 2;
            state.timer[i] = T;
            moved++;
          }
        }
      }
      if (moved > 0) {
        state.safetyScares++;
        state.reg = Math.min(1, state.reg + 0.18);
        addEvent(state, `Safety scare: ${moved} AI-designed therapies pulled back into trials. Regulators tighten`, 'bad');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 10: PLATFORM BREAKTHROUGH
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const pm = params.priority === 'platforms' ? 3 : 1;
    const platProb = (params.spill / 100) * Math.min(0.85, pm * (0.04 + 0.12 * Math.max(0, P)));
    const u = rng.uniform();

    if (u < platProb) {
      // Pick a random unused family
      const unusedFams: number[] = [];
      for (let f = 0; f < TOTAL_FAMILIES; f++) {
        if (!state.usedFamilies[f]) unusedFams.push(f);
      }

      if (unusedFams.length > 0) {
        const u2 = rng.uniform();
        const famIdx = unusedFams[Math.floor(u2 * unusedFams.length)];
        state.usedFamilies[famIdx] = true;

        const boost = params.priority === 'platforms' ? 0.9 : 0.7;
        let count = 0;

        for (let i = 0; i < N; i++) {
          if (state.fam[i] === famIdx) {
            if (state.stage[i] === 1) {
              state.prog[i] += boost * state.diff[i];
              count++;
            } else if (state.stage[i] === 0 && state.kind[i] === 1) {
              // Undiscovered pool member
              state.prog[i] += boost * state.diff[i];
            }
          }
        }

        state.platforms++;
        const famInfo = FAMILIES[famIdx];
        addEvent(state, `Platform breakthrough: ${famInfo.platform} unlocks ${count} ${famInfo.name} diseases`, 'plat');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 11: SURPRISE BREAKTHROUGH
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const surpriseProb = (params.surprise / 100) * 0.2;
    const u = rng.uniform();

    if (u < surpriseProb) {
      const u2 = rng.uniform();
      if (u2 < 0.5) {
        // Pick a stage 1 disease proportional to burden
        let totalBurden = 0;
        for (let i = 0; i < N; i++) {
          if (state.stage[i] === 1) totalBurden += state.burden[i];
        }

        if (totalBurden > 0) {
          const u3 = rng.uniform();
          let target = u3 * totalBurden;
          let picked = -1;
          for (let i = 0; i < N; i++) {
            if (state.stage[i] === 1) {
              target -= state.burden[i];
              if (target <= 0) {
                picked = i;
                break;
              }
            }
          }

          if (picked >= 0) {
            state.prog[picked] = state.diff[picked];
            state.stage[picked] = 2;
            state.timer[picked] = 0.7 * T;
            addEvent(state, `Surprise result: a lab fast-tracks ${getName(state, picked)} into trials`, 'surp');
          }
        }
      } else {
        // AI capability boost — only if not on a plateau
        if (state.plLeft === 0) {
          state.C = 1.3 * state.C;
          addEvent(state, 'Surprise: an unexpected architecture jump boosts AI capability 30%', 'surp');
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 12: MILESTONES AND AGING
  // ═══════════════════════════════════════════════════════════════════════════

  const logC = Math.floor(Math.log10(state.C));
  if (logC > state.lastMilestone && logC >= 1) {
    state.lastMilestone = logC;
    addEvent(state, `AI research capability passes ${fmtBig(Math.pow(10, logC))}\u00d7 today`, 'ai');
  }

  const deltaAging = Math.min(2.5, 0.012 * Math.sqrt(D_aging) * (0.2 + 0.8 * c));
  state.agingGain += deltaAging;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 13: BURDEN, LIFE EXPECTANCY, YEAR RECORD
  // ═══════════════════════════════════════════════════════════════════════════

  const prevLE = state.LE;
  const metrics = recompute(state);

  if (metrics.totalBurden > 0) {
    state.LE = Math.min(500, BASELINE_LE + 16.7 * (metrics.avertedBurden / metrics.totalBurden) + state.agingGain);
  }
  state.healthyYears += metrics.avertedBurden;

  const dLE = state.LE - prevLE;

  state.hist.push({
    y: state.year,
    erad: E,
    newF,
    LE: state.LE,
    dLE,
    dAg: deltaAging,
    C: state.C,
    reg: state.reg,
    rem: metrics.remaining,
    eradCum: metrics.eradCum,
    healthy: state.healthyYears,
    T,
    p,
    D: D + D_aging,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 14: END CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const h = state.hist;
  if (h.length >= 3) {
    const n = h.length;
    const avg = (key: keyof typeof h[0]) => {
      return ((h[n - 1][key] as number) + (h[n - 2][key] as number) + (h[n - 3][key] as number)) / 3;
    };

    // Escape velocity
    if (!state.escapeVelocityReached && avg('dAg') >= 1) {
      state.escapeVelocityReached = true;
      state.levYear = state.year;
      addEvent(state, 'Longevity escape velocity: aging research now adds more than one year of life per year', 'win');
    }

    // Crossover
    if (state.crossYear === null && avg('erad') > avg('newF') && avg('erad') > 0) {
      state.crossYear = state.year;
      addEvent(state, 'Crossover: cures now outpace newly found diseases', 'win');
      if (params.endAtCross) {
        state.done = true;
      }
    }
  }

  // Full eradication
  if (metrics.remaining === 0 && state.poolLeft === 0) {
    state.fullYear = state.year;
    addEvent(state, 'Every known disease is eradicated', 'win');
    state.done = true;
  }

  // Time limit
  if (state.year >= END_YEAR) {
    state.done = true;
  }
}
