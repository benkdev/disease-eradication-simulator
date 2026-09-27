import type { RunSummary, YearRecord } from '../engine';

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

/**
 * Captures a canvas element as a PNG image and initiates download.
 */
export function exportChartPNG(canvasElement?: HTMLCanvasElement | null): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = canvasElement ?? document.querySelector('canvas');
  if (!canvas) return false;
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'tld-simulation-chart.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}
