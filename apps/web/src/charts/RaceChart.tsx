/**
 * RaceChart — log-scale canvas chart showing new diseases vs eradicated per year.
 * Pinned axes to the full run range, drawn up to currentYear.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { YearRecord } from '../engine';

interface RaceChartProps {
  fullHist?: YearRecord[];
  currentYear?: number;
  hist?: YearRecord[]; // Backwards compatibility
  crossYear: number | null;
}

function getCSS(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function RaceChart({
  fullHist: propFullHist,
  currentYear: propCurrentYear,
  hist,
  crossYear,
}: RaceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fullHist = propFullHist ?? hist ?? [];
  const currentYear =
    propCurrentYear ?? (fullHist.length > 0 ? fullHist[fullHist.length - 1].y : 2026);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || fullHist.length === 0) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = 170;
    if (w === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const muted = getCSS('--muted');
    const gridColor = getCSS('--chartgrid');
    const resHi = getCSS('--res-hi');
    const good = getCSS('--good');

    const padL = 34,
      padR = 16,
      padT = 8,
      padB = 18;
    const plotL = padL,
      plotR = w - padR,
      plotT = padT,
      plotB = h - padB;
    const plotW = plotR - plotL,
      plotH = plotB - plotT;

    // Fixed X range
    const minYear = 2026;
    const finalYear = fullHist.length > 0 ? fullHist[fullHist.length - 1].y : 2026;
    const maxYear = Math.max(finalYear, 2046);
    const span = maxYear - minYear;
    const xForYear = (y: number) => plotL + ((y - minYear) / span) * plotW;

    // Fixed Y range from fullHist maximums
    let maxVal = 10;
    for (const r of fullHist) {
      maxVal = Math.max(maxVal, r.newF + 1, r.erad + 1);
    }
    const maxLog = Math.ceil(Math.log10(maxVal));

    const yForVal = (v: number) => {
      const lv = Math.log10(v + 1);
      return plotB - (lv / maxLog) * plotH;
    };

    // Grid lines at powers of 10
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '10px "Schibsted Grotesk", system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const gridVals = [0];
    for (let p = 1; p <= maxLog; p++) gridVals.push(Math.pow(10, p));
    for (const gv of gridVals) {
      const gy = yForVal(gv);
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
      const label = gv === 0 ? '0' : gv < 1000 ? String(gv) : `${gv / 1000}k`;
      ctx.fillText(label, padL - 4, gy);
    }

    // Lines drawn up to currentYear
    const visibleHist = fullHist.filter((r) => r.y <= currentYear);

    const drawLine = (key: 'newF' | 'erad', color: string) => {
      if (visibleHist.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < visibleHist.length; i++) {
        const x = xForYear(visibleHist[i].y);
        const y = yForVal(visibleHist[i][key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('newF', resHi);
    drawLine('erad', good);

    // Crossover marker appears only once currentYear reaches crossYear
    if (crossYear !== null && currentYear >= crossYear) {
      const x = xForYear(crossYear);
      ctx.strokeStyle = good;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, plotT);
      ctx.lineTo(x, plotB);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [fullHist, currentYear, crossYear]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(draw);
    obs.observe(container);
    return () => obs.disconnect();
  }, [draw]);

  useEffect(() => {
    const obs = new MutationObserver(draw);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', draw);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', draw);
    };
  }, [draw]);

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 className="section-heading" id="race-chart-heading">
        The race: new diseases vs cures
      </h2>
      <div ref={containerRef} className="panel" style={{ height: 170 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-labelledby="race-chart-heading"
          aria-label="Log-scale chart plotting new diseases found per year versus diseases eradicated per year"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          Log-scale comparison chart between newly discovered diseases and eradicated diseases per
          year.
        </canvas>

        <div className="sr-only" aria-live="polite" data-testid="race-chart-sr-summary">
          <p>
            {`Year ${currentYear}: ${fullHist.find((r) => r.y === currentYear)?.newF ?? 0} new diseases discovered per year, ${fullHist.find((r) => r.y === currentYear)?.erad ?? 0} diseases eradicated per year.`}
            {crossYear && currentYear >= crossYear
              ? ` Crossover point reached in ${crossYear}.`
              : ' Crossover not yet reached.'}
          </p>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 4 }}>
        Log scale. Pink = new diseases found per year. Green = diseases eradicated per year. The run
        ends when the green line crosses above the pink line.
      </p>
    </div>
  );
}
