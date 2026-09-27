import { useState, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  parseExportedCSV,
  parseExportedJSON,
  type SimulationExportPayload,
} from '../utils/exportData';
import { GROWTH_PRESETS, type Params } from '../engine';

interface ImportModalProps {
  onClose: () => void;
  onReplay: (payload: SimulationExportPayload) => void;
  onSimulate: (payload: SimulationExportPayload, chosenGrowth: Params['growth']) => void;
}

export function ImportModal({ onClose, onReplay, onSimulate }: ImportModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [payload, setPayload] = useState<SimulationExportPayload | null>(null);
  const [selectedGrowth, setSelectedGrowth] = useState<Params['growth']>('exp');
  const [originalGrowth, setOriginalGrowth] = useState<Params['growth']>('exp');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useFocusTrap(cardRef, true, onClose);

  const processFileContent = (name: string, content: string) => {
    setError(null);
    try {
      let parsed: SimulationExportPayload;
      const lower = name.toLowerCase();
      if (lower.endsWith('.csv') || (!lower.endsWith('.json') && content.includes(','))) {
        parsed = parseExportedCSV(content);
      } else {
        parsed = parseExportedJSON(content);
      }

      setFileName(name);
      setPayload(parsed);

      // Determine original growth mode
      const detectedGrowth: Params['growth'] =
        parsed.params?.growth ??
        (parsed.scenario.toLowerCase().includes('plateau') ||
        parsed.scenario.toLowerCase().includes('wave')
          ? 'waves'
          : 'exp');

      setOriginalGrowth(detectedGrowth);
      setSelectedGrowth(detectedGrowth);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse simulation file. Please upload a valid .json or .csv export.'
      );
      setPayload(null);
      setFileName(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) processFileContent(file.name, content);
    };
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) processFileContent(file.name, content);
    };
    reader.readAsText(file);
  };

  const finalYear =
    payload?.summary?.endYear ??
    (payload && payload.history.length > 0 ? payload.history[payload.history.length - 1].y : 2026);

  const seed = payload?.seed ?? payload?.summary?.seed ?? 'Unknown';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
      data-testid="import-modal"
    >
      <div
        className="modal-card"
        ref={cardRef}
        style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h2 id="import-title" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            Import Simulation Run
          </h2>
          <button
            type="button"
            data-testid="close-import-btn"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        <p className="hint" style={{ marginBottom: 16 }}>
          Upload a previously exported <code>.json</code> or <code>.csv</code> simulation file to
          replay results or test counterfactual scenarios with the same seed.
        </p>

        {/* Dropzone */}
        {!payload && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            data-testid="import-dropzone"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 12,
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'var(--panel)' : 'transparent',
              marginBottom: 16,
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              data-testid="import-file-input"
            />
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Drop your export file here, or click to browse
            </div>
            <div className="hint" style={{ fontSize: '0.8rem' }}>
              Supports .json and .csv formats
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            data-testid="import-error"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(194, 57, 95, 0.12)',
              color: 'var(--bad, #c2395f)',
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Parsed Run Summary Details */}
        {payload && (
          <div>
            <div
              data-testid="import-preview-card"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <strong style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{fileName}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setPayload(null);
                    setFileName(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Change file
                </button>
              </div>
              <div
                className="hint"
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  fontSize: '0.8rem',
                }}
              >
                <span>
                  <strong>Seed:</strong> #{seed}
                </span>
                <span>
                  <strong>Final Year:</strong> {finalYear}
                </span>
                {payload.summary && (
                  <span>
                    <strong>Life Exp:</strong> {payload.summary.lifeExpectancy.toFixed(1)} yrs
                  </span>
                )}
                {payload.summary?.outcome && (
                  <span>
                    <strong>Outcome:</strong> {payload.summary.outcome}
                  </span>
                )}
              </div>
            </div>

            {/* Growth Mode Selection */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                Execution Mode
              </div>
              <p className="hint" style={{ fontSize: '0.8rem', marginBottom: 10 }}>
                Both options use the imported seed and parameters. Select the other mode to run an
                A/B counterfactual experiment.
              </p>

              <div
                role="radiogroup"
                aria-label="Execution growth mode"
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {(['exp', 'waves'] as const).map((key) => {
                  const preset = GROWTH_PRESETS[key];
                  const isSelected = selectedGrowth === key;
                  const isOriginal = originalGrowth === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      data-testid={`import-growth-option-${key}`}
                      onClick={() => setSelectedGrowth(key)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                        background: 'var(--bg)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <strong style={{ fontSize: '0.9rem' }}>{preset.label}</strong>
                        {isOriginal ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'var(--panel)',
                              border: '1px solid var(--line)',
                              color: 'var(--good, #1f8a6a)',
                              fontWeight: 600,
                            }}
                          >
                            Original Run
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'rgba(91, 58, 140, 0.1)',
                              color: 'var(--accent)',
                              fontWeight: 600,
                            }}
                          >
                            ✨ Try Counterfactual
                          </span>
                        )}
                      </div>
                      <span className="hint" style={{ fontSize: '0.78rem' }}>
                        {key === 'exp'
                          ? 'Compounds continuously without stalling.'
                          : 'Same parameters, but AI stalls at plateau ceilings until breakthroughs.'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary"
                data-testid="import-replay-btn"
                onClick={() => onReplay(payload)}
                style={{ flex: 1, minWidth: 140, fontWeight: 600 }}
              >
                Replay Saved Run
              </button>
              <button
                type="button"
                className="primary"
                data-testid="import-simulate-btn"
                onClick={() => onSimulate(payload, selectedGrowth)}
                style={{ flex: 1, minWidth: 140, fontWeight: 700 }}
              >
                Simulate Run (▶)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
