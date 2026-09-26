import { useEffect, useRef } from 'react';
import { fmtBig, fmtNum, type RunSummary } from '../engine';

interface ResultsModalProps {
  summary: RunSummary;
  scenarioLabel: string;
  onClose: () => void;
  onKeepGoing: () => void;
  onNewRun: () => void;
}

export function ResultsModal({ summary, scenarioLabel, onClose, onKeepGoing, onNewRun }: ResultsModalProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="results-title">
      <div className="modal-card">
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close results"
          style={{ position: 'absolute', top: 12, left: 12 }}
        >
          ×
        </button>

        <div style={{ paddingTop: 32 }}>
          <h2 id="results-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h2>
          <div style={{
            fontSize: '3.2rem',
            fontWeight: 800,
            color: 'var(--good)',
            lineHeight: 1,
            margin: '8px 0',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {endYear}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            {summaryText} <em>{scenarioLabel}.</em>
          </p>

          <dl style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '6px 16px',
            fontSize: '0.85rem',
            marginBottom: 20,
          }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--muted)' }}>{label}</dt>
                <dd style={{ fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.outcome === 'crossover' && (
              <button className="primary" onClick={onKeepGoing} ref={primaryRef} style={{ width: '100%' }}>
                Keep going to full eradication
              </button>
            )}
            <button onClick={onNewRun} ref={summary.outcome !== 'crossover' ? primaryRef : undefined} style={{ width: '100%' }}>
              New run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
