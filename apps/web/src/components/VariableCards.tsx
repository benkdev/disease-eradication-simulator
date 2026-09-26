import { useState, useCallback } from 'react';
import { fmtBig, fmtNum, type YearRecord } from '@tld/engine';

// Variable definitions matching spec Section 6 exactly
interface VarDef {
  key: keyof YearRecord;
  name: string;
  color: string;
  scale: 'log' | 'linear';
  lo?: number;
  hi?: number;
  format: (v: number) => string;
  defaultOn: boolean;
}

export const VARIABLE_DEFS: VarDef[] = [
  { key: 'C',        name: 'AI capability (log)',     color: '--v1',  scale: 'log',    format: v => v < 10 ? `${v.toFixed(1)}×` : `${fmtBig(v)}×`,       defaultOn: true  },
  { key: 'reg',      name: 'Regulation',              color: '--v2',  scale: 'linear', lo: 0, hi: 1, format: v => `${Math.round(v * 100)}/100`,          defaultOn: true  },
  { key: 'rem',      name: 'Diseases remaining',      color: '--v3',  scale: 'linear', lo: 0, format: v => fmtNum(v),                                    defaultOn: true  },
  { key: 'eradCum',  name: 'Eradicated',              color: '--v4',  scale: 'linear', lo: 0, format: v => fmtNum(v),                                    defaultOn: true  },
  { key: 'LE',       name: 'Life expectancy',         color: '--v6',  scale: 'linear', lo: 73, format: v => `${v.toFixed(1)} yrs`,                 defaultOn: true  },
  { key: 'newF',     name: 'New diseases per year',   color: '--v5',  scale: 'linear', lo: 0, format: v => fmtNum(v),                                    defaultOn: false },
  { key: 'healthy',  name: 'Healthy years gained',    color: '--v8',  scale: 'linear', lo: 0, format: v => fmtBig(v),                                    defaultOn: false },
  { key: 'D',        name: 'Discoveries per year',    color: '--v11', scale: 'log',    format: v => fmtBig(v),                                            defaultOn: false },
  { key: 'T',        name: 'Trial length',            color: '--v7',  scale: 'linear', lo: 0, format: v => `${v.toFixed(1)} yrs`,                        defaultOn: false },
  { key: 'p',        name: 'Trial success rate',      color: '--v10', scale: 'linear', lo: 0, hi: 1, format: v => `${Math.round(v * 100)}%`,             defaultOn: false },
];

interface VariableCardsProps {
  rec: YearRecord | null;
  cursorActive: boolean;
  enabled?: boolean[];
  onToggle?: (idx: number) => void;
}

export function VariableCards({ rec, cursorActive, enabled: propEnabled, onToggle }: VariableCardsProps) {
  const [localEnabled, setLocalEnabled] = useState<boolean[]>(() => VARIABLE_DEFS.map(d => d.defaultOn));
  const enabled = propEnabled ?? localEnabled;

  const toggle = useCallback((idx: number) => {
    if (onToggle) {
      onToggle(idx);
    } else {
      setLocalEnabled(prev => {
        const next = [...prev];
        next[idx] = !next[idx];
        return next;
      });
    }
  }, [onToggle]);

  return (
    <div
      className="variable-cards"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
        marginBottom: 12,
      }}
    >
      {VARIABLE_DEFS.map((def, i) => {
        const on = enabled[i];
        const value = rec ? (rec[def.key] as number) : 0;
        const color = `var(${def.color})`;

        return (
          <button
            key={def.key}
            aria-pressed={on}
            onClick={() => toggle(i)}
            data-var-idx={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 10,
              border: on ? `1.5px solid ${color}` : '1px solid var(--line)',
              background: 'var(--panel)',
              textAlign: 'left',
              minHeight: 'auto',
              cursor: 'pointer',
              opacity: on ? 1 : 0.7,
            }}
          >
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              flexShrink: 0,
              background: on ? color : 'transparent',
              border: on ? 'none' : `2px solid ${color}`,
            }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block' }}>
                {def.name}
              </span>
              <span className="tabular" style={{ fontSize: '0.92rem', fontWeight: 700, display: 'block' }}>
                {rec ? def.format(value) : '—'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Get which variables are currently enabled (for the chart) */
export function useEnabledVars(): boolean[] {
  // This is a simplification — we'll read from DOM data attributes
  return VARIABLE_DEFS.map(d => d.defaultOn);
}
