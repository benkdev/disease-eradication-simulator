import { fmtBig } from '@tld/engine';

interface HeaderProps {
  scenarioLabel: string;
  year: number;
  C: number;
  started: boolean;
}

export function Header({ scenarioLabel, year, C, started }: HeaderProps) {
  const capText = C < 10 ? `${C.toFixed(1)}× today` : `${fmtBig(C)}× today`;

  return (
    <header
      data-testid="app-header"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>
          The Last Disease
        </h1>
        <p className="hint" data-testid="header-scenario" style={{ fontSize: '0.8rem' }}>
          {started ? scenarioLabel : 'How long until AI cures everything?'}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          data-testid="header-year"
          role="status"
          aria-label={`Current simulation year: ${year}`}
          style={{
            fontSize: 'clamp(3rem, 15vw, 5.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 0.85,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {year}
        </div>
        {started && (
          <div className="hint" data-testid="header-capability" style={{ fontSize: '0.8rem', marginTop: 2 }}>
            AI capability {capText}
          </div>
        )}
      </div>
    </header>
  );
}
