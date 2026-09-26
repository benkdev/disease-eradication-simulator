import { useState } from 'react';
import { GROWTH_PRESETS, type Params } from '@tld/engine';

interface SetupModalProps {
  getParams: () => Params;
  onStart: (growth: Params['growth']) => void;
}

export function SetupModal({ getParams, onStart }: SetupModalProps) {
  const params = getParams();
  const [selected, setSelected] = useState<Params['growth']>(params.growth);

  const handleStart = () => {
    onStart(selected);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="modal-card">
        <h2 id="setup-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
          How does AI grow?
        </h2>
        <p className="hint" style={{ marginBottom: 16 }}>
          Pick one, then watch it play out.
        </p>

        <div role="radiogroup" aria-label="Growth shape" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {(['exp', 'waves'] as const).map(key => {
            const preset = GROWTH_PRESETS[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(key)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                  background: 'var(--bg)',
                  minHeight: 'auto',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ fontSize: '0.92rem' }}>{preset.label}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                  {preset.description(params)}
                </p>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'sticky', bottom: 0, paddingTop: 8 }}>
          <button
            className="primary"
            onClick={handleStart}
            style={{ width: '100%', fontWeight: 700, fontSize: '0.95rem' }}
            autoFocus
          >
            Start run
          </button>
        </div>
      </div>
    </div>
  );
}
