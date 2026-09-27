import type { RunSummary, YearRecord } from '../engine';
import { fmtNum } from '../engine';
import { VARIABLE_DEFS } from '../components/VariableCards';

/**
 * Triggers a client-side file download using a temporary Blob URL.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Serializes year records to CSV format and initiates download.
 */
export function exportToCSV(hist: YearRecord[], seed: number | string): void {
  const headers = [
    'Year',
    'AI_Capability',
    'Regulation',
    'Life_Expectancy',
    'Life_Expectancy_Delta',
    'Aging_Delta',
    'Healthy_Years_Gained',
    'Remaining_Diseases',
    'Eradicated_This_Year',
    'Cumulative_Eradicated',
    'New_Diseases_Found',
    'Trial_Length',
    'Trial_Success_Rate',
    'Discoveries_Per_Year',
  ];

  const rows = hist.map((r) => [
    r.y,
    r.C.toFixed(2),
    r.reg.toFixed(3),
    r.LE.toFixed(2),
    r.dLE.toFixed(2),
    r.dAg.toFixed(3),
    r.healthy.toFixed(2),
    r.rem,
    r.erad,
    r.eradCum,
    r.newF,
    r.T.toFixed(2),
    r.p.toFixed(3),
    r.D.toFixed(2),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  downloadFile(csvContent, `tld-simulation-seed-${seed}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Serializes run summary and full history to formatted JSON and initiates download.
 */
export function exportToJSON(summary: RunSummary, hist: YearRecord[], scenarioLabel: string): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    scenario: scenarioLabel,
    summary,
    history: hist,
  };
  const jsonContent = JSON.stringify(payload, null, 2);
  downloadFile(jsonContent, `tld-simulation-seed-${summary.seed}.json`, 'application/json');
}

export interface ExportChartOptions {
  canvasElement?: HTMLCanvasElement | null;
  scenarioLabel?: string;
  summary?: RunSummary;
  fullHist?: YearRecord[];
  enabledVars?: boolean[];
}

const FALLBACK_VAR_COLORS: Record<string, string> = {
  '--v1': '#5b3a8c',
  '--v2': '#b7791f',
  '--v3': '#c2395f',
  '--v4': '#1f8a6a',
  '--v5': '#e07b39',
  '--v6': '#2b7bb9',
  '--v7': '#8a5a44',
  '--v8': '#9b3fb5',
  '--v9': '#4f7a28',
  '--v10': '#d14f9e',
  '--v11': '#3e6e8e',
};

function getCSSProperty(name: string, fallback: string): string {
  try {
    if (
      typeof document === 'undefined' ||
      typeof window === 'undefined' ||
      !document.documentElement ||
      typeof window.getComputedStyle !== 'function'
    ) {
      return fallback;
    }
    const style = window.getComputedStyle(document.documentElement);
    const val = style ? style.getPropertyValue(name)?.trim() : '';
    return val || fallback;
  } catch {
    return fallback;
  }
}

function triggerCanvasDownload(canvas: HTMLCanvasElement): boolean {
  if (!canvas || typeof canvas.toDataURL !== 'function') return false;
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'tld-simulation-chart.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

/**
 * Captures the simulation chart along with an accessible visual legend, title, and theme styling as a PNG image.
 */
export function exportChartPNG(
  optionsOrCanvas?: ExportChartOptions | HTMLCanvasElement | null
): boolean {
  if (typeof document === 'undefined') return false;

  let options: ExportChartOptions = {};
  if (optionsOrCanvas && 'toDataURL' in optionsOrCanvas) {
    options = { canvasElement: optionsOrCanvas as HTMLCanvasElement };
  } else if (optionsOrCanvas) {
    options = optionsOrCanvas as ExportChartOptions;
  }

  const canvas = options.canvasElement ?? document.querySelector('canvas');
  if (!canvas || typeof canvas.toDataURL !== 'function') return false;

  try {
    const exportCanvas = document.createElement('canvas');
    if (!exportCanvas || typeof exportCanvas.getContext !== 'function') {
      return triggerCanvasDownload(canvas);
    }

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      return triggerCanvasDownload(canvas);
    }

    const srcW = canvas.width;
    const srcH = canvas.height;
    if (srcW === 0 || srcH === 0) {
      return triggerCanvasDownload(canvas);
    }

    const scale = Math.max(1, srcW / 800);

    const isDark =
      Boolean(
        document.documentElement?.getAttribute &&
        document.documentElement.getAttribute('data-theme') === 'dark'
      ) ||
      Boolean(
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)')?.matches
      );

    const bgColor = getCSSProperty('--bg', isDark ? '#16121c' : '#f7f2f5');
    const inkColor = getCSSProperty('--ink', isDark ? '#f1eaf4' : '#2a1b3d');
    const mutedColor = getCSSProperty('--muted', isDark ? '#a596ae' : '#6e6078');
    const lineColor = getCSSProperty('--line', isDark ? '#342b3f' : '#e3d8e2');
    const goodColor = getCSSProperty('--good', isDark ? '#6fd3a4' : '#1f8a6a');
    const accentColor = getCSSProperty('--accent', isDark ? '#b79be6' : '#5b3a8c');

    // Determine enabled variables
    const enabledIndices: number[] = [];
    if (options.enabledVars && options.enabledVars.length === VARIABLE_DEFS.length) {
      options.enabledVars.forEach((on, i) => {
        if (on) enabledIndices.push(i);
      });
    } else {
      const buttons =
        typeof document.querySelectorAll === 'function'
          ? document.querySelectorAll('[data-testid^="var-card-"]')
          : [];
      if (buttons.length > 0) {
        buttons.forEach((btn) => {
          const idxStr = btn.getAttribute('data-var-idx');
          const isPressed = btn.getAttribute('aria-pressed') === 'true';
          if (idxStr !== null) {
            const idx = parseInt(idxStr, 10);
            if (isPressed && !isNaN(idx)) enabledIndices.push(idx);
          }
        });
      }
      if (enabledIndices.length === 0) {
        VARIABLE_DEFS.forEach((d, i) => {
          if (d.defaultOn) enabledIndices.push(i);
        });
      }
    }

    const fullHist = options.fullHist;
    const latestRec = fullHist && fullHist.length > 0 ? fullHist[fullHist.length - 1] : null;

    interface LegendEntry {
      label: string;
      color: string;
      dashed?: boolean;
    }

    const legendItems: LegendEntry[] = enabledIndices.map((i) => {
      const def = VARIABLE_DEFS[i];
      const color = getCSSProperty(def.color, FALLBACK_VAR_COLORS[def.color] ?? '#5b3a8c');
      const valStr = latestRec ? ` (${def.format(latestRec[def.key] as number)})` : '';
      return {
        label: `${def.name}${valStr}`,
        color,
      };
    });

    if (options.summary?.crossYear) {
      legendItems.push({
        label: `Crossover (${options.summary.crossYear})`,
        color: goodColor,
        dashed: true,
      });
    }
    if (options.summary?.levYear) {
      legendItems.push({
        label: `Escape Velocity (${options.summary.levYear})`,
        color: accentColor,
        dashed: true,
      });
    }

    const padX = Math.round(20 * scale);
    const titleText = options.scenarioLabel
      ? `${options.scenarioLabel}${options.summary?.seed ? ` — Seed ${options.summary.seed}` : ''}`
      : 'The Last Disease — Simulation Trajectory';

    let subtitleText = '';
    if (options.summary) {
      const outcomeLabel =
        options.summary.outcome === 'full'
          ? 'Every disease eradicated'
          : options.summary.outcome === 'crossover'
            ? 'Crossover reached'
            : 'Simulation limit (2300)';
      subtitleText = `${outcomeLabel} · Final Year: ${options.summary.endYear} · Eradicated: ${fmtNum(options.summary.eradicated)} · Life Expectancy: ${options.summary.lifeExpectancy.toFixed(1)} yrs`;
    }

    const headerTopPad = Math.round(18 * scale);
    const headerH = subtitleText ? Math.round(58 * scale) : Math.round(40 * scale);

    const legendFontSize = Math.round(12 * scale);
    const legendFont = `500 ${legendFontSize}px "Schibsted Grotesk", system-ui, sans-serif`;
    ctx.font = legendFont;

    const sampleW = Math.round(22 * scale);
    const gapX = Math.round(20 * scale);
    const rowH = Math.round(24 * scale);

    let curX = padX;
    let numRows = 1;
    const positionedItems: {
      label: string;
      color: string;
      dashed?: boolean;
      x: number;
      row: number;
    }[] = [];

    for (const item of legendItems) {
      const textW = ctx.measureText ? ctx.measureText(item.label).width : item.label.length * 7;
      const itemW = sampleW + Math.round(8 * scale) + textW;

      if (curX + itemW > srcW - padX && curX > padX) {
        curX = padX;
        numRows++;
      }

      positionedItems.push({
        ...item,
        x: curX,
        row: numRows - 1,
      });

      curX += itemW + gapX;
    }

    const legendPadTop = Math.round(16 * scale);
    const legendH = numRows * rowH + legendPadTop + Math.round(16 * scale);
    const totalH = headerH + srcH + legendH;

    exportCanvas.width = srcW;
    exportCanvas.height = totalH;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, srcW, totalH);

    // Header Title
    ctx.fillStyle = inkColor;
    ctx.font = `bold ${Math.round(18 * scale)}px "Schibsted Grotesk", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(titleText, padX, headerTopPad);

    // Header Subtitle
    if (subtitleText) {
      ctx.fillStyle = mutedColor;
      ctx.font = `${Math.round(12 * scale)}px "Schibsted Grotesk", system-ui, sans-serif`;
      ctx.fillText(subtitleText, padX, headerTopPad + Math.round(24 * scale));
    }

    // Main Chart
    ctx.drawImage(canvas, 0, headerH, srcW, srcH);

    // Legend Separator
    const sepY = headerH + srcH + Math.round(6 * scale);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, sepY);
    ctx.lineTo(srcW - padX, sepY);
    ctx.stroke();

    // Legend Items
    const legendStartY = headerH + srcH + legendPadTop;
    ctx.font = legendFont;
    ctx.textBaseline = 'middle';

    for (const item of positionedItems) {
      const itemY = legendStartY + item.row * rowH + rowH / 2;

      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.round(3 * scale);
      ctx.lineCap = 'round';
      if (item.dashed) {
        ctx.setLineDash([Math.round(4 * scale), Math.round(3 * scale)]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(item.x, itemY);
      ctx.lineTo(item.x + sampleW, itemY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = inkColor;
      ctx.textAlign = 'left';
      ctx.fillText(item.label, item.x + sampleW + Math.round(8 * scale), itemY);
    }

    return triggerCanvasDownload(exportCanvas);
  } catch {
    return triggerCanvasDownload(canvas);
  }
}
