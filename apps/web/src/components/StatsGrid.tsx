import { fmtNum, fmtBig, type YearRecord } from '@tld/engine';

interface StatsGridProps {
  rec: YearRecord | null;
}

export function StatsGrid({ rec }: StatsGridProps) {
  if (!rec) return null;

  const regPercent = Math.round(rec.reg * 100);
  const regLabel = rec.reg < 0.33 ? 'Laissez-faire' : rec.reg > 0.66 ? 'Strict' : 'Moderate';

  const cells: { value: string; label: string }[] = [
    { value: fmtNum(rec.rem),       label: 'Diseases remaining' },
    { value: fmtNum(rec.eradCum),   label: 'Eradicated' },
    { value: fmtNum(rec.newF),      label: 'New diseases found this year' },
    { value: fmtNum(rec.erad),      label: 'Eradicated this year' },
    { value: fmtBig(rec.healthy),   label: 'Healthy years gained' },
    { value: `${rec.LE.toFixed(1)} yrs`, label: 'Life expectancy' },
    { value: fmtBig(rec.D),         label: 'Discoveries this year' },
    { value: `${rec.T.toFixed(1)} yrs, ${Math.round(rec.p * 100)}%`, label: 'Trial length, success rate' },
  ];

  return (
    <div role="region" aria-label="Simulation annual metrics" style={{ marginBottom: 16 }}>
      <div
        className="stats-grid panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              borderBottom: i < 6 ? '1px solid var(--line)' : undefined,
              borderRight: i % 2 === 0 ? '1px solid var(--line)' : undefined,
            }}
          >
            <div className="tabular" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {cell.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {cell.label}
            </div>
          </div>
        ))}
      </div>

      {/* Regulation meter */}
      <div className="panel" style={{ padding: '10px 12px', marginTop: -1, borderRadius: '0 0 12px 12px', borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 6 }}>
          Regulatory climate ({regPercent})
        </div>
        <div
          role="progressbar"
          aria-label="Regulatory climate"
          aria-valuenow={regPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${regPercent} out of 100 (${regLabel})`}
          style={{
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(to right, var(--trial), var(--res-lo))`,
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <div style={{
            position: 'absolute',
            left: `${rec.reg * 100}%`,
            top: -4,
            width: 4,
            height: 16,
            borderRadius: 2,
            background: 'var(--ink)',
            transform: 'translateX(-50%)',
            transition: 'left 0.3s',
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: 'var(--muted)',
          marginTop: 4,
        }}>
          <span>Laissez-faire</span>
          <span>Strict</span>
        </div>
      </div>
    </div>
  );
}
