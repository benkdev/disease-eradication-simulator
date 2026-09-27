import type { EventEntry } from '../engine';

interface EventLogProps {
  events: EventEntry[];
  currentYear?: number;
}

const KIND_STYLES: Record<EventEntry['kind'], { color: string; fontWeight: number }> = {
  win:  { color: 'var(--good)', fontWeight: 600 },
  bad:  { color: 'var(--bad)',  fontWeight: 400 },
  plat: { color: 'var(--plat)', fontWeight: 600 },
  surp: { color: 'var(--surp)', fontWeight: 400 },
  ai:   { color: 'var(--ink)',  fontWeight: 400 },
};

export function EventLog({ events, currentYear }: EventLogProps) {
  const filtered = currentYear !== undefined
    ? events.filter(e => e.year <= currentYear)
    : events;

  const displayed = [...filtered]
    .sort((a, b) => b.year - a.year)
    .slice(0, 40);

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 className="section-heading" id="event-log-heading">What happened</h2>
      <div
        role="log"
        aria-labelledby="event-log-heading"
        tabIndex={0}
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          fontSize: '0.8rem',
          lineHeight: 1.4,
          padding: '4px 0',
        }}
      >
        {displayed.map((ev, i) => {
          const style = KIND_STYLES[ev.kind];
          return (
            <div key={`${ev.year}-${i}`} style={{ display: 'flex', padding: '3px 0', gap: 4 }}>
              <span className="tabular" style={{
                width: '3.2em',
                flexShrink: 0,
                color: 'var(--muted)',
                fontWeight: 500,
              }}>
                {ev.year}
              </span>
              <span style={{ color: style.color, fontWeight: style.fontWeight }}>
                {ev.msg}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
