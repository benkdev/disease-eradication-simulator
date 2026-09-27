import { useState, useRef } from 'react';
import { GROWTH_PRESETS, type Params } from '@tld/engine';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SetupModalProps {
  getParams: () => Params;
  onStart: (growth: Params['growth']) => void;
}

const PRESET_KEYS: Array<Params['growth']> = ['exp', 'waves'];

export function SetupModal({ getParams, onStart }: SetupModalProps) {
  const params = getParams();
  const [selected, setSelected] = useState<Params['growth']>(params.growth);
  const cardRef = useRef<HTMLDivElement>(null);

  // Accessible focus trap: keeps Tab navigation within the modal dialog
  useFocusTrap(cardRef, true);

  const handleStart = () => {
    onStart(selected);
  };

  const handleKeyDownRadiogroup = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (PRESET_KEYS.indexOf(selected) + 1) % PRESET_KEYS.length;
      setSelected(PRESET_KEYS[nextIdx]);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (PRESET_KEYS.indexOf(selected) - 1 + PRESET_KEYS.length) % PRESET_KEYS.length;
      setSelected(PRESET_KEYS[prevIdx]);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
      aria-describedby="setup-desc"
      data-testid="setup-modal"
    >
      <div className="modal-card" ref={cardRef}>
        <h2 id="setup-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
          How does AI grow?
        </h2>
        <p id="setup-desc" className="hint" style={{ marginBottom: 16 }}>
          Pick one, then watch it play out.
        </p>

        <div
          role="radiogroup"
          aria-label="Growth shape"
          onKeyDown={handleKeyDownRadiogroup}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}
        >
          {PRESET_KEYS.map(key => {
            const preset = GROWTH_PRESETS[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                data-testid={`growth-preset-${key}`}
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
            data-testid="start-run-btn"
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
