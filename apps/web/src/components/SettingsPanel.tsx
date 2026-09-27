import { useCallback } from 'react';
import { PARAM_RANGES, PRIORITY_LABELS, type Params } from '../engine';

interface SettingsPanelProps {
  getParams: () => Params;
  updateParam?: <K extends keyof Params>(key: K, value: Params[K]) => void;
}

const GROUPS = ['AI progress', 'Regulation', 'Diseases', 'Events', 'Aging and ending'];

export function SettingsPanel({ getParams }: SettingsPanelProps) {
  const params = getParams();

  const renderSlider = useCallback(
    (key: string) => {
      const range = PARAM_RANGES[key];
      if (!range) return null;
      const value = (params as unknown as Record<string, unknown>)[key] as number;

      // Special handling for ceiling (log10 scale)
      const isLog = key === 'ceiling';
      const sliderMin = isLog ? Math.log10(range.min) : range.min;
      const sliderMax = isLog ? Math.log10(range.max) : range.max;
      const sliderValue = isLog ? Math.log10(value) : value;
      const frac = Math.max(
        0,
        Math.min(1, (sliderValue - sliderMin) / (sliderMax - sliderMin || 1))
      );

      return (
        <div key={key} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              marginBottom: 4,
            }}
          >
            <span>{range.label}</span>
            <span className="tabular" style={{ fontWeight: 600, color: 'var(--accent)' }}>
              {range.format(value)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={range.min}
            aria-valuemax={range.max}
            aria-label={range.label}
            style={{
              width: '100%',
              height: 6,
              background: 'var(--line)',
              borderRadius: 3,
              overflow: 'hidden',
              margin: '6px 0',
            }}
          >
            <div
              style={{
                width: `${frac * 100}%`,
                height: '100%',
                background: 'var(--accent)',
                borderRadius: 3,
              }}
            />
          </div>
          {range.hint && (
            <p className="hint" style={{ marginTop: 2 }}>
              {range.hint}
            </p>
          )}
        </div>
      );
    },
    [params]
  );

  return (
    <details data-testid="settings-panel" style={{ marginBottom: 8 }}>
      <summary data-testid="settings-summary">Settings</summary>
      <div>
        {GROUPS.map((group) => {
          const keys = Object.keys(PARAM_RANGES).filter((k) => PARAM_RANGES[k].group === group);
          if (keys.length === 0) return null;

          return (
            <fieldset key={group} style={{ border: 'none', padding: 0, marginBottom: 16 }}>
              <legend
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  marginBottom: 8,
                }}
              >
                {group}
              </legend>

              {/* Growth shape view-only */}
              {group === 'AI progress' && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: 4,
                    }}
                  >
                    <span>Growth shape</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {params.growth === 'exp' ? 'Exponential' : 'Exponential with plateaus'}
                    </span>
                  </div>
                </div>
              )}

              {/* Research priority view-only */}
              {group === 'Diseases' && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: 4,
                    }}
                  >
                    <span>Research priority</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {PRIORITY_LABELS[params.priority]}
                    </span>
                  </div>
                </div>
              )}

              {keys.map(renderSlider)}

              {/* endAtCross & seed view-only */}
              {group === 'Aging and ending' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        marginBottom: 4,
                      }}
                    >
                      <span>Stop at the crossover</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {params.endAtCross ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        marginBottom: 4,
                      }}
                    >
                      <span>Run seed</span>
                      <span className="tabular" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {params.seed === 0 ? 'random' : params.seed}
                      </span>
                    </div>
                    <p className="hint" style={{ marginTop: 2 }}>
                      {params.seed === 0 ? 'Random run.' : 'Fixed seed replaying the same luck.'}
                    </p>
                  </div>
                </>
              )}
            </fieldset>
          );
        })}
      </div>
    </details>
  );
}
