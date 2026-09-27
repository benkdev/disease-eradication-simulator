import { useEffect, useRef } from 'react';
import { fmtBig, fmtNum, type RunSummary, type YearRecord } from '../engine';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { exportToCSV, exportToJSON, exportChartPNG } from '../utils/exportData';

interface ResultsModalProps {
  summary: RunSummary;
  scenarioLabel: string;
  onClose: () => void;
  onKeepGoing: () => void;
  onNewRun: () => void;
  fullHist?: YearRecord[];
  enabledVars?: boolean[];
}

export function ResultsModal({
  summary,
  scenarioLabel,
  onClose,
  onKeepGoing,
  onNewRun,
  fullHist,
  enabledVars,
}: ResultsModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Accessible focus trap and Escape key listener
  useFocusTrap(cardRef, true, onClose);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  const endYear = summary.endYear;
  const yearsFromNow = endYear - 2026;

  let title: string;
  let summaryText: string;
  if (summary.outcome === 'full') {
    title = 'Every disease eradicated';
    summaryText = `${yearsFromNow} years from today.`;
  } else if (summary.outcome === 'crossover') {
    title = 'Crossover reached';
    summaryText = `After ${yearsFromNow} years, diseases are now being eradicated faster than new ones are found.`;
  } else {
    title = 'Out of time';
    summaryText = 'The simulation stops at 2300.';
  }

  const rows: [string, string][] = [
    ['Diseases eradicated', fmtNum(summary.eradicated)],
    ['Still in progress', fmtNum(summary.remaining)],
    ['Healthy years gained', fmtBig(summary.healthyYears)],
    ['Life expectancy', `${summary.lifeExpectancy.toFixed(1)} yrs`],
    ['Longevity escape velocity', summary.levYear ? String(summary.levYear) : 'Not yet'],
    ['Pandemics', String(summary.pandemics)],
    ['Platform breakthroughs', String(summary.platforms)],
    ['Safety scares', String(summary.safetyScares)],
    ['AI capability', `${fmtBig(summary.finalCapability)}×`],
    ['Run seed', String(summary.seed)],
  ];

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      aria-describedby="results-summary-text"
      data-testid="results-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" ref={cardRef}>
        <button
          className="close-btn"
          data-testid="results-close-btn"
          onClick={onClose}
          aria-label="Close results dialog"
          style={{ position: 'absolute', top: 12, left: 12 }}
        >
          ×
        </button>

        <div style={{ paddingTop: 32 }}>
          <h2
            id="results-title"
            data-testid="results-title"
            style={{ fontSize: '1.5rem', fontWeight: 700 }}
          >
            {title}
          </h2>
          <div
            data-testid="results-end-year"
            style={{
              fontSize: '3.2rem',
              fontWeight: 800,
              color: 'var(--good)',
              lineHeight: 1,
              margin: '8px 0',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {endYear}
          </div>
          <p
            id="results-summary-text"
            style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}
          >
            {summaryText} <em>{scenarioLabel}.</em>
          </p>

          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '6px 16px',
              fontSize: '0.85rem',
              marginBottom: 20,
            }}
          >
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--muted)' }}>{label}</dt>
                <dd
                  style={{
                    fontWeight: 600,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {fullHist && fullHist.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="hint" style={{ fontSize: '0.8rem', marginBottom: 6 }}>
                Export Run Data
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  data-testid="export-csv-btn"
                  onClick={() => exportToCSV(fullHist, summary.seed)}
                  style={{ flex: 1, minWidth: 90, fontSize: '0.8rem', padding: '6px 10px' }}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  data-testid="export-json-btn"
                  onClick={() => exportToJSON(summary, fullHist, scenarioLabel)}
                  style={{ flex: 1, minWidth: 90, fontSize: '0.8rem', padding: '6px 10px' }}
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  data-testid="export-png-btn"
                  onClick={() =>
                    exportChartPNG({
                      scenarioLabel,
                      summary,
                      fullHist,
                      enabledVars,
                    })
                  }
                  style={{ flex: 1, minWidth: 90, fontSize: '0.8rem', padding: '6px 10px' }}
                >
                  Save Image
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.outcome === 'crossover' && (
              <button
                className="primary"
                data-testid="keep-going-btn"
                onClick={onKeepGoing}
                ref={primaryRef}
                style={{ width: '100%' }}
              >
                Keep going to full eradication
              </button>
            )}
            <button
              data-testid="results-new-run-btn"
              onClick={onNewRun}
              ref={summary.outcome !== 'crossover' ? primaryRef : undefined}
              style={{ width: '100%' }}
            >
              New run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
