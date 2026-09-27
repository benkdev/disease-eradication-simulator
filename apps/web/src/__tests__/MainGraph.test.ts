import { describe, it, expect } from 'vitest';
import { simulate, seriesBounds, DEFAULTS } from '../engine';
import { VARIABLE_DEFS } from '../components/VariableCards';
import { getLineBounds, computeLineY } from '../charts/MainGraph';

describe('MainGraph line drawing and bounds', () => {
  it('uses lo = 73 and hi = seriesBounds(fullHist).LE.max for the Life expectancy line', () => {
    const res = simulate({ ...DEFAULTS, growth: 'exp', seed: 0 });
    const fullHist = res.hist;
    const bounds = seriesBounds(fullHist);

    const leDef = VARIABLE_DEFS.find(d => d.key === 'LE')!;
    expect(leDef).toBeDefined();

    const lineBounds = getLineBounds(leDef, bounds);
    expect(lineBounds.lo).toBe(73);
    expect(lineBounds.hi).toBe(bounds.LE.max);
  });

  it('draws the last point of every enabled monotonic line (AI capability, eradicated, life expectancy) at the top gridline for a completed run', () => {
    // Test across presets and seeds for completed runs
    for (const growth of ['exp', 'waves'] as const) {
      for (const seed of [0, 1, 7]) {
        const res = simulate({ ...DEFAULTS, growth, seed });
        expect(res.done).toBe(true);

        const fullHist = res.hist;
        expect(fullHist.length).toBeGreaterThan(0);
        const lastRec = fullHist[fullHist.length - 1];
        const bounds = seriesBounds(fullHist);

        // MainGraph canvas plot metrics
        const padT = 44;
        const h = 400;
        const padB = 26;
        const plotT = padT;
        const plotB = h - padB;
        const plotH = plotB - plotT;

        // Top gridline is at i = 0 in gy = plotT + (plotH * i) / 4 => plotT
        const topGridlineY = plotT;

        // Monotonic lines explicitly specified: AI capability, eradicated, life expectancy
        const monotonicKeys = [
          { key: 'C', name: 'AI capability (log)' },
          { key: 'eradCum', name: 'Eradicated' },
          { key: 'LE', name: 'Life expectancy' },
        ] as const;

        for (const item of monotonicKeys) {
          const def = VARIABLE_DEFS.find(d => d.key === item.key)!;
          expect(def).toBeDefined();
          expect(def.defaultOn).toBe(true);

          const { lo, hi } = getLineBounds(def, bounds);

          if (item.key === 'LE') {
            expect(lo).toBe(73);
            expect(hi).toBe(bounds.LE.max);
          }

          const rawVal = lastRec[item.key] as number;
          const transformedVal = def.scale === 'log' ? Math.log10(Math.max(1, rawVal)) : rawVal;

          const lastPointY = computeLineY(transformedVal, lo, hi, plotT, plotH);

          // Verify the last point is drawn exactly at the top gridline
          expect(lastPointY).toBeCloseTo(topGridlineY, 5);
        }
      }
    }
  });

  it('draws every enabled monotonic line to the top gridline in full canvas drawing pass', () => {
    const res = simulate({ ...DEFAULTS, growth: 'exp', seed: 42 });
    const fullHist = res.hist;
    const bounds = seriesBounds(fullHist);

    const padT = 44;
    const h = 350;
    const padB = 26;
    const plotT = padT;
    const plotB = h - padB;
    const plotH = plotB - plotT;
    const topGridlineY = plotT;

    const monotonicKeys = new Set(['C', 'eradCum', 'LE']);

    VARIABLE_DEFS.filter(d => d.defaultOn && monotonicKeys.has(d.key)).forEach(def => {
      const { lo, hi } = getLineBounds(def, bounds);
      const vals = fullHist.map(r => r[def.key] as number);
      const transformed = def.scale === 'log'
        ? vals.map(v => Math.log10(Math.max(1, v)))
        : vals;

      const lastTransformed = transformed[transformed.length - 1];
      const yLast = computeLineY(lastTransformed, lo, hi, plotT, plotH);

      expect(yLast).toBeCloseTo(topGridlineY, 5);
    });
  });
});
