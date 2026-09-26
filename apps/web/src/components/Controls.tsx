interface ControlsProps {
  playing: boolean;
  done: boolean;
  speed: number;
  onTogglePlay: () => void;
  onStepOnce: () => void;
  onNewRun: () => void;
  onSetSpeed: (s: number) => void;
}

const SPEEDS = [1, 2, 4, 10];

export function Controls({
  playing, done, speed,
  onTogglePlay, onStepOnce, onNewRun, onSetSpeed,
}: ControlsProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          className="primary"
          onClick={onTogglePlay}
          disabled={done}
          style={{ minWidth: 92 }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={onStepOnce} disabled={done}>
          +1 year
        </button>
        <button onClick={onNewRun}>
          New run
        </button>
      </div>

      {/* Speed control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="hint" style={{ fontSize: '0.8rem' }}>Years per second</span>
        <div
          role="group"
          aria-label="Simulation speed"
          style={{
            display: 'inline-flex',
            border: '1px solid var(--line)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          {SPEEDS.map(s => (
            <button
              key={s}
              aria-pressed={speed === s}
              onClick={() => onSetSpeed(s)}
              style={{
                minWidth: 36,
                minHeight: 32,
                borderRadius: 0,
                border: 'none',
                borderRight: '1px solid var(--line)',
                background: speed === s ? 'var(--accent)' : 'var(--panel)',
                color: speed === s ? 'var(--panel)' : 'var(--ink)',
                fontWeight: speed === s ? 700 : 400,
                fontSize: '0.8rem',
                padding: '0 8px',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
