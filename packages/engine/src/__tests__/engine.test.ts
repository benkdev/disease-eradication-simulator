/**
 * Engine tests: golden run, calibration, unit tests.
 * Section 9 of the spec defines all expected values.
 */

import { describe, it, expect } from 'vitest';
import {
  mulberry32, fmtBig, createSim, step, runToEnd, summarize,
  DEFAULTS, TYPE_INFO, TOTAL_KNOWN,
} from '../index.js';
import type { Params } from '../index.js';

// ── Unit tests ───────────────────────────────────────────────────────────────

describe('mulberry32', () => {
  it('produces the specified sequence for seed 1', () => {
    const rng = mulberry32(1);
    const expected = [0.6270739406, 0.0027357212, 0.5274470400, 0.9810509675, 0.9683778982];
    for (const e of expected) {
      const val = rng();
      expect(val).toBeCloseTo(e, 10);
    }
  });
});

describe('fmtBig', () => {
  it('formats numbers correctly', () => {
    expect(fmtBig(999)).toBe('999');
    expect(fmtBig(1000)).toBe('1 thousand');
    expect(fmtBig(6400)).toBe('6.4 thousand');
    expect(fmtBig(22000)).toBe('22 thousand');
    expect(fmtBig(1.5e6)).toBe('1.5 million');
    expect(fmtBig(1e25)).toBe('10^25');
  });
});

describe('M(R)', () => {
  it('returns correct values at R = 0, 0.5, and 1', () => {
    const M = (R: number) => R < 0.5 ? 1.25 - 0.5 * R : 1 - 1.3 * (R - 0.5);
    expect(M(0)).toBeCloseTo(1.25, 10);
    expect(M(0.5)).toBeCloseTo(1.0, 10);
    expect(M(1)).toBeCloseTo(0.35, 10);
  });
});

describe('pipeline speed', () => {
  it('at C=1, R=0.5: T=8, p=0.1', () => {
    const C = 1;
    const R = 0.5;
    const P = Math.log(C) / Math.log(10000);
    const cc = 1 - Math.exp(-2.2 * Math.max(0, P) * (1 - 0.7 * R));
    const T = 0.4 + 7.6 * (1 - cc);
    const p = 0.1 + 0.8 * cc;
    expect(P).toBeCloseTo(0, 10);
    expect(cc).toBeCloseTo(0, 10);
    expect(T).toBeCloseTo(8, 10);
    expect(p).toBeCloseTo(0.1, 10);
  });

  it('at C=10000, R=0.5: P=1, c near 0.667', () => {
    const C = 10000;
    const R = 0.5;
    const P = Math.log(C) / Math.log(10000);
    const cc = 1 - Math.exp(-2.2 * Math.max(0, P) * (1 - 0.7 * R));
    expect(P).toBeCloseTo(1, 10);
    expect(cc).toBeGreaterThan(0.5);
    expect(cc).toBeLessThan(1);
  });
});

// ── Initialization tests ─────────────────────────────────────────────────────

describe('initialization', () => {
  it('creates the correct total number of diseases', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    expect(state.N).toBe(42150);
  });

  it('has correct initial stage counts', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < state.N; i++) {
      counts[state.stage[i]]++;
    }
    // Expected: 25150 · 16383 · 517 · 100 · 0
    expect(counts[0]).toBe(25150);
    expect(counts[1]).toBe(16383);
    expect(counts[2]).toBe(517);
    expect(counts[3]).toBe(100);
    expect(counts[4]).toBe(0);
  });

  it('has correct type counts for known diseases', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    const typeCounts = new Array(6).fill(0);
    for (let i = 0; i < TOTAL_KNOWN; i++) {
      typeCounts[state.type[i]]++;
    }
    for (let t = 0; t < 6; t++) {
      expect(typeCounts[t]).toBe(TYPE_INFO[t].known);
    }
  });
});

// ── Determinism test ─────────────────────────────────────────────────────────

describe('determinism', () => {
  it('two runs with same params and seed produce identical histories', () => {
    const params: Params = { ...DEFAULTS, seed: 42 };
    const s1 = runToEnd(params);
    const s2 = runToEnd(params);
    expect(s1).toEqual(s2);
  });
});

// ── Golden run (seed 12345) ──────────────────────────────────────────────────

describe('golden run (seed 12345)', () => {
  describe('ending at the crossover', () => {
    const params: Params = { ...DEFAULTS, seed: 12345 };
    const summary = runToEnd(params);

    it('crossover year = 2054', () => {
      expect(summary.crossYear).toBe(2054);
    });

    it('escape velocity year = 2033', () => {
      expect(summary.levYear).toBe(2033);
    });

    it('eradicated at end = 6,092', () => {
      expect(summary.eradicated).toBe(6092);
    });

    it('remaining at end = 33,942', () => {
      expect(summary.remaining).toBe(33942);
    });

    it('healthy years gained ≈ 21,453,310,019', () => {
      expect(summary.healthyYears).toBe(21453310019);
    });

    it('life expectancy at end ≈ 257.175', () => {
      expect(summary.lifeExpectancy).toBeCloseTo(257.175, 3);
    });

    it('pandemics = 5, platforms = 3, safety scares = 5', () => {
      expect(summary.pandemics).toBe(5);
      expect(summary.platforms).toBe(3);
      expect(summary.safetyScares).toBe(5);
    });
  });

  describe('with endAtCross = false', () => {
    const params: Params = { ...DEFAULTS, seed: 12345, endAtCross: false };
    const summary = runToEnd(params);

    it('full eradication in 2080', () => {
      expect(summary.fullYear).toBe(2080);
    });

    it('life expectancy at end ≈ 498.365', () => {
      expect(summary.lifeExpectancy).toBeCloseTo(498.365, 3);
    });
  });
});

// ── Longevity scaling tests (seeds 1 to 20) ───────────────────────────────────

describe('longevity scaling tests (seeds 1 to 20)', () => {
  const growthModels = ['exp', 'waves'] as const;

  for (const growth of growthModels) {
    it(`growth "${growth}": LE at full eradication is between 490 and 500, never exceeds 500`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const state = createSim({ ...DEFAULTS, seed, growth, endAtCross: false });
        let maxLE = 0;
        while (!state.done) {
          step(state);
          if (state.LE > maxLE) maxLE = state.LE;
          expect(state.LE).toBeLessThanOrEqual(500);
        }
        const summary = summarize(state);
        expect(summary.fullYear).not.toBeNull();
        expect(summary.lifeExpectancy).toBeGreaterThanOrEqual(490);
        expect(summary.lifeExpectancy).toBeLessThanOrEqual(500);
        expect(maxLE).toBeLessThanOrEqual(500);
      }
    });
  }
});

// ── Performance ──────────────────────────────────────────────────────────────

describe('performance', () => {
  it('one full default run completes in under 500ms (warm)', () => {
    // Warm up JIT
    runToEnd({ ...DEFAULTS, seed: 1 });
    // Measure
    const start = performance.now();
    runToEnd({ ...DEFAULTS, seed: 99 });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
