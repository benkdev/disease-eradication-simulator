/**
 * LongevityChart — linear canvas chart showing aging delta (dAg) per year.
 * Pinned axes to the full run range, drawn up to currentYear.
 * Escape velocity = when this stays above 1.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { YearRecord } from '../engine';

interface LongevityChartProps {
  fullHist?: YearRecord[];
  currentYear?: number;
  hist?: YearRecord[]; // Backwards compatibility
  levYear: number | null;
}

function getCSS(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function LongevityChart({
  fullHist: propFullHist,
  currentYear: propCurrentYear,
  hist,
  levYear,
}: LongevityChartProps) {
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
    const accent = getCSS('--accent');

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

    // Fixed Y axis from fullHist maximums
    const maxDag = Math.max(2, ...fullHist.map((r) => r.dAg));
    const yMax = Math.ceil(maxDag);
    const yForVal = (v: number) => plotB - (v / yMax) * plotH;

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '10px "Schibsted Grotesk", system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridStep = yMax > 4 ? 1 : 0.5;
    for (let gv = 0; gv <= yMax; gv += gridStep) {
      const gy = yForVal(gv);
      ctx.beginPath();
      ctx.moveTo(plotL, gy);
      ctx.lineTo(plotR, gy);
      ctx.stroke();
      if (gv === Math.round(gv)) {
        ctx.fillText(String(gv), padL - 4, gy);
      }
    }

    // Dashed line at 1 (escape velocity threshold)
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const y1 = yForVal(1);
    ctx.moveTo(plotL, y1);
    ctx.lineTo(plotR, y1);
    ctx.stroke();
    ctx.setLineDash([]);

    // dAg line drawn up to currentYear
    const visibleHist = fullHist.filter((r) => r.y <= currentYear);
    if (visibleHist.length >= 2) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < visibleHist.length; i++) {
        const x = xForYear(visibleHist[i].y);
        const y = yForVal(visibleHist[i].dAg);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Escape velocity dot appears only once currentYear reaches levYear
    if (levYear !== null && currentYear >= levYear) {
      const x = xForYear(levYear);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y1, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [fullHist, currentYear, levYear]);

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
      <h2 className="section-heading" id="longevity-chart-heading">
        Longevity
      </h2>
      <div ref={containerRef} className="panel" style={{ height: 170 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-labelledby="longevity-chart-heading"
          aria-label="Longevity chart plotting years of life added per year by aging research over time"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          Longevity curve charting years of healthy life added per year against longevity escape
          velocity threshold of 1.0.
        </canvas>
      </div>
      <p className="hint" style={{ marginTop: 4 }}>
        Years of life added per year by aging research. Longevity escape velocity is when this stays
        above 1.
      </p>
    </div>
  );
}
