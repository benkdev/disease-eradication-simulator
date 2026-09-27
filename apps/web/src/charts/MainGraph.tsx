/**
 * MainGraph — the hero canvas line graph showing all enabled variables.
 * Drawn with Canvas 2D API at devicePixelRatio for crisp lines.
 * Features: pinned axes to full run bounds, progressive line reveal up to currentYear,
 * plateau bands, conditional crossover/escape velocity markers, clamped scrubbing cursor.
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { YearRecord } from '../engine';
import { seriesBounds, type SeriesBoundsMap } from '../engine';
import { VARIABLE_DEFS, type VarDef } from '../components/VariableCards';

export interface LineBounds {
  lo: number;
  hi: number;
}

export function getLineBounds(def: VarDef, bounds: SeriesBoundsMap): LineBounds {
  const b = bounds[def.key];
  if (def.key === 'LE') {
    return {
      lo: 73,
      hi: bounds.LE ? bounds.LE.max : (b?.max ?? 73),
    };
  }
  if (def.scale === 'log') {
    const bLogMin = b?.logMin ?? (b?.min !== undefined ? Math.log10(Math.max(1, b.min)) : 0);
    const bLogMax = b?.logMax ?? (b?.max !== undefined ? Math.log10(Math.max(1, b.max)) : 1);
    const lo = def.lo !== undefined ? def.lo : bLogMin;
    const hi = def.hi !== undefined ? def.hi : bLogMax;
    return { lo, hi };
  }
  const lo = def.lo !== undefined ? def.lo : (b?.min ?? 0);
  const hi = def.hi !== undefined ? def.hi : (b?.max ?? 1);
  return { lo, hi };
}

export function computeLineY(
  v: number,
  lo: number,
  hi: number,
  plotT: number,
  plotH: number
): number {
  const range = hi - lo || 1;
  return plotT + plotH * (1 - (v - lo) / range);
}

interface MainGraphProps {
  fullHist?: YearRecord[];
  currentYear?: number;
  hist?: YearRecord[]; // Backwards compatibility
  plateaus: [number, number | null][];
  crossYear: number | null;
  levYear: number | null;
  cursorYear: number | null;
  onCursorChange: (y: number | null) => void;
  enabledVars?: boolean[];
}

function getCSS(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function MainGraph({
  fullHist: propFullHist,
  currentYear: propCurrentYear,
  hist,
  plateaus,
  crossYear,
  levYear,
  cursorYear,
  onCursorChange,
  enabledVars,
}: MainGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fullHist = propFullHist ?? hist ?? [];
  const currentYear =
    propCurrentYear ?? (fullHist.length > 0 ? fullHist[fullHist.length - 1].y : 2026);

  const bounds = useMemo(() => seriesBounds(fullHist), [fullHist]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || fullHist.length === 0) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Colors from CSS tokens
    const ink = getCSS('--ink');
    const muted = getCSS('--muted');
    const gridColor = getCSS('--chartgrid');
    const good = getCSS('--good');
    const accent = getCSS('--accent');

    // Get enabled vars
    const activeVarIndices: number[] = [];
    if (enabledVars && enabledVars.length > 0) {
      enabledVars.forEach((isOn, idx) => {
        if (isOn) activeVarIndices.push(idx);
      });
    } else {
      VARIABLE_DEFS.forEach((d, i) => {
        if (d.defaultOn) activeVarIndices.push(i);
      });
    }

    // Top padding is fixed for the whole run based on precomputed markers so axes never shift
    const hasRunBoth = crossYear !== null && levYear !== null;
    const hasRunMarkers = crossYear !== null || levYear !== null;

    // Padding
    const padL = 8,
      padR = 12,
      padB = 26;
    const padT = hasRunBoth ? 44 : hasRunMarkers ? 28 : 16;

    const plotL = padL;
    const plotR = w - padR;
    const plotT = padT;
    const plotB = h - padB;
    const plotW = plotR - plotL;
    const plotH = plotB - plotT;

    // X axis range: fixed from 2026 to max(final year, 2046) for the whole run
    const minYear = 2026;
    const finalYear = fullHist.length > 0 ? fullHist[fullHist.length - 1].y : 2026;
    const maxYear = Math.max(finalYear, 2046);
    const span = maxYear - minYear;

    const xForYear = (y: number) => plotL + ((y - minYear) / span) * plotW;

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const gy = plotT + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
    }

    // X axis labels
    const labelInterval = span > 120 ? 50 : span > 60 ? 20 : span > 25 ? 10 : 5;
    ctx.fillStyle = muted;
    ctx.font = '11px "Schibsted Grotesk", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    for (
      let y = Math.ceil(minYear / labelInterval) * labelInterval;
      y <= maxYear;
      y += labelInterval
    ) {
      const x = xForYear(y);
      if (x > plotR - 30) {
        ctx.textAlign = 'right';
      } else {
        ctx.textAlign = 'center';
      }
      ctx.fillText(String(y), x, plotB + 6);
    }

    // Plateau bands: draw only the part at or before currentYear
    const v1Color = getCSS('--v1');
    for (const [start, end] of plateaus) {
      if (start > currentYear) continue;
      const bandStart = Math.max(start, minYear);
      const bandEnd = Math.min(end ?? currentYear, currentYear, maxYear);
      if (bandEnd < bandStart) continue;
      const x1 = xForYear(bandStart);
      const x2 = xForYear(bandEnd);
      ctx.fillStyle = v1Color;
      ctx.globalAlpha = 0.1;
      ctx.fillRect(x1, plotT, x2 - x1, plotH);
      ctx.globalAlpha = 1;
    }

    // Draw each line only up to currentYear
    const visibleHist = fullHist.filter((r) => r.y <= currentYear);

    for (const vi of activeVarIndices) {
      const def = VARIABLE_DEFS[vi];
      const color = getCSS(def.color);

      // Bounds from seriesBounds(fullHist) with fixed bounds taking priority
      const { lo, hi } = getLineBounds(def, bounds);
      const yForVal = (v: number) => computeLineY(v, lo, hi, plotT, plotH);

      if (visibleHist.length === 0) continue;

      const vals = visibleHist.map((r) => r[def.key] as number);
      const transformed = def.scale === 'log' ? vals.map((v) => Math.log10(Math.max(1, v))) : vals;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < visibleHist.length; i++) {
        const x = xForYear(visibleHist[i].y);
        const y = yForVal(transformed[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Markers: Crossover and escape velocity appear only once currentYear reaches their year
    const drawMarker = (year: number, color: string, label: string, row: number) => {
      const x = xForYear(year);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, plotT);
      ctx.lineTo(x, plotB);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '600 11px "Schibsted Grotesk", system-ui, sans-serif';
      ctx.fillStyle = color;
      ctx.textBaseline = 'bottom';
      const labelY = plotT - 4 - row * 15;
      const labelW = ctx.measureText(label).width;
      if (x + labelW + 6 > plotR) {
        ctx.textAlign = 'right';
        ctx.fillText(label, x - 4, labelY);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 4, labelY);
      }
    };

    const showCross = crossYear !== null && currentYear >= crossYear;
    const showLev = levYear !== null && currentYear >= levYear;

    if (showCross) {
      drawMarker(crossYear!, good, 'Crossover', 0);
    }
    if (showLev) {
      drawMarker(levYear!, accent, 'Longevity escape velocity', showCross ? 1 : 0);
    }

    // Cursor (can scrub only years up to currentYear)
    if (cursorYear !== null) {
      const clampedCursor = Math.min(currentYear, cursorYear);
      const x = xForYear(clampedCursor);
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, plotT);
      ctx.lineTo(x, plotB);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = 'bold 12px "Schibsted Grotesk", system-ui, sans-serif';
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(clampedCursor), x, plotB - 6);
    }
  }, [fullHist, currentYear, plateaus, crossYear, levYear, cursorYear, enabledVars, bounds]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(draw);
    obs.observe(container);
    return () => obs.disconnect();
  }, [draw]);

  // Theme change observer
  useEffect(() => {
    const obs = new MutationObserver(draw);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', draw);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', draw);
    };
  }, [draw]);

  // Cursor handling — scrub only years up to currentYear
  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || fullHist.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padL = 8,
        padR = 12;
      const plotW = rect.width - padL - padR;
      const minYear = 2026;
      const finalYear = fullHist[fullHist.length - 1].y;
      const maxYear = Math.max(finalYear, 2046);
      const frac = (x - padL) / plotW;
      const year = Math.round(minYear + frac * (maxYear - minYear));
      const clamped = Math.max(minYear, Math.min(currentYear, year));
      onCursorChange(clamped);
    },
    [fullHist, currentYear, onCursorChange]
  );

  const visibleHist = useMemo(
    () => fullHist.filter(r => r.y <= currentYear),
    [fullHist, currentYear]
  );
  const latestRec = visibleHist.length > 0 ? visibleHist[visibleHist.length - 1] : null;

  const milestones = useMemo(() => {
    if (visibleHist.length === 0) return [];
    const set = new Set<number>();
    const startY = visibleHist[0].y;
    const lastY = visibleHist[visibleHist.length - 1].y;
    set.add(startY);
    set.add(lastY);
    if (crossYear && crossYear <= currentYear) set.add(crossYear);
    if (levYear && levYear <= currentYear) set.add(levYear);
    for (const r of visibleHist) {
      if (r.y % 5 === 0) set.add(r.y);
    }
    return visibleHist.filter(r => set.has(r.y));
  }, [visibleHist, crossYear, levYear, currentYear]);

  return (
    <div
      ref={containerRef}
      className="chart-panel"
      data-testid="main-graph-container"
      style={{ height: 300, marginBottom: 4, touchAction: 'pan-y', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Main simulation graph showing enabled variables over time"
        data-testid="main-graph-canvas"
        style={{ width: '100%', height: '100%', display: 'block' }}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerUp={() => onCursorChange(null)}
        onPointerLeave={() => onCursorChange(null)}
        onPointerCancel={() => onCursorChange(null)}
      >
        Dynamic multi-line chart displaying AI capability, regulation, diseases remaining, disease
        eradications, and life expectancy from 2026 onwards.
      </canvas>

      {/* Accessible screen-reader data summary and table for WCAG 2.1 AA */}
      <div className="sr-only" aria-live="polite" data-testid="main-graph-sr-summary">
        <h3>Simulation Timeline Data Summary</h3>
        <p>
          {`Current simulation year is ${currentYear}. `}
          {latestRec
            ? `AI capability is ${latestRec.C.toFixed(1)}x, life expectancy is ${latestRec.LE.toFixed(1)} years, and ${latestRec.erad} diseases have been eradicated.`
            : ''}
          {crossYear && currentYear >= crossYear ? ` Crossover was reached in ${crossYear}.` : ''}
          {levYear && currentYear >= levYear ? ` Longevity escape velocity was reached in ${levYear}.` : ''}
        </p>
        <table>
          <caption>Simulation milestone and decadal data points</caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">AI Capability</th>
              <th scope="col">Eradicated Diseases</th>
              <th scope="col">Life Expectancy</th>
              <th scope="col">Regulation</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map(r => (
              <tr key={r.y}>
                <th scope="row">{r.y}</th>
                <td>{r.C?.toFixed(1) ?? '1.0'}x</td>
                <td>{r.eradCum ?? r.erad ?? 0}</td>
                <td>{r.LE?.toFixed(1) ?? '73.0'} yrs</td>
                <td>{r.reg !== undefined ? (r.reg * 100).toFixed(0) : '50'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
