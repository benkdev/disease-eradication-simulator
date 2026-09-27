import { useState } from 'react';

interface ControlsProps {
  playing: boolean;
  done: boolean;
  speed: number;
  onTogglePlay: () => void;
  onStepOnce: () => void;
  onNewRun: () => void;
  onSetSpeed: (s: number) => void;
  onShare?: () => void;
}

const SPEEDS = [1, 2, 4, 10];

export function Controls({
  playing,
  done,
  speed,
  onTogglePlay,
  onStepOnce,
  onNewRun,
  onSetSpeed,
  onShare,
}: ControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (onShare) {
      onShare();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div data-testid="controls-panel" style={{ marginBottom: 16 }}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button
          className="primary"
          data-testid="play-pause-btn"
          aria-label={playing ? 'Pause simulation' : 'Play simulation'}
          onClick={onTogglePlay}
          disabled={done}
          style={{ minWidth: 92 }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          data-testid="step-once-btn"
          aria-label="Advance simulation by one year"
          onClick={onStepOnce}
          disabled={done}
        >
          +1 year
        </button>
        <button
          data-testid="new-run-btn"
          aria-label="Start a new simulation run"
          onClick={onNewRun}
        >
          New run
        </button>
        {onShare && (
          <button
            data-testid="share-btn"
            aria-label="Share current simulation setup"
            onClick={handleShare}
            title="Copy shareable link with current parameters"
          >
            {copied ? 'Copied link!' : 'Share'}
          </button>
        )}
      </div>

      {/* Speed control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="hint" id="speed-label" style={{ fontSize: '0.8rem' }}>
          Years per second
        </span>
        <div
          role="group"
          aria-labelledby="speed-label"
          style={{
            display: 'inline-flex',
            border: '1px solid var(--line)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              aria-pressed={speed === s}
              aria-label={`${s} years per second`}
              data-testid={`speed-btn-${s}`}
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
