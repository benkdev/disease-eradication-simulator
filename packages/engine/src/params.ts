/**
 * Simulation parameters, defaults, and validation ranges.
 * Every field matches Section 5 of the spec exactly.
 */

// ── Params type ──────────────────────────────────────────────────────────────

export interface Params {
  // AI progress
  g0: number;                               // Model improvement rate (%)
  acc: number;                              // Acceleration (% per year)
  growth: 'exp' | 'waves';                  // Growth shape
  ceiling: number;                          // First plateau (actual multiplier)
  plen: number;                             // Typical plateau length (years)
  aiBase: number;                           // AI discoveries in 2026
  human: number;                            // Human baseline discoveries

  // Regulation
  reg0: number;                             // Starting climate (0-100)
  vol: number;                              // Political volatility (0-100)

  // Diseases
  newBase: number;                          // New diseases found in 2026
  beta: number;                             // AI boost to finding diseases (0-100)
  pool: number;                             // Undiscovered diseases
  priority: 'killers' | 'rare' | 'platforms' | 'aging';
  res: number;                              // Resistance chance (%)

  // Events
  spill: number;                            // Platform breakthroughs (% of normal)
  pand: number;                             // Pandemic chance (% per year)
  surprise: number;                         // Surprise breakthroughs (% of normal)

  // Aging and ending
  aging: number;                            // AI effort on aging (%)
  endAtCross: boolean;                      // Stop at crossover
  seed: number;                             // 0 = random
  lemax: number;                            // Maximum life expectancy
  q0: number;                               // Aging research difficulty
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULTS: Readonly<Params> = {
  g0: 35,
  acc: 1,
  growth: 'exp',
  ceiling: 100,
  plen: 5,
  aiBase: 20,
  human: 50,
  reg0: 50,
  vol: 50,
  newBase: 200,
  beta: 35,
  pool: 25000,
  priority: 'killers',
  res: 4,
  spill: 100,
  pand: 3,
  surprise: 100,
  aging: 10,
  endAtCross: true,
  seed: 0,
  lemax: 500,
  q0: 20,
};

// ── Ranges for validation and Settings UI ────────────────────────────────────

export interface ParamRange {
  min: number;
  max: number;
  step: number;
  label: string;
  hint: string;
  group: string;
  format: (v: number) => string;
}

export const PARAM_RANGES: Record<string, ParamRange> = {
  g0:      { min: 5,   max: 150,    step: 1,    group: 'AI progress',       label: 'Model improvement rate',     hint: 'How much AI research capability improves each year.',                                                                          format: v => `${v}% per year` },
  acc:     { min: 0,   max: 20,     step: 0.5,  group: 'AI progress',       label: 'Acceleration',               hint: 'How fast the improvement rate itself speeds up, such as AI helping build better AI.',                                           format: v => `${v}% per year` },
  ceiling: { min: 10,  max: 1e6,    step: 0,    group: 'AI progress',       label: 'First plateau',              hint: 'Where AI first stalls when plateaus are on. Each later plateau hits somewhere 10 to 100 times higher.',                         format: v => `${v}× today` },
  plen:    { min: 1,   max: 20,     step: 1,    group: 'AI progress',       label: 'Typical plateau length',     hint: 'Each plateau lasts between half and one and a half times this long.',                                                           format: v => `${v} years` },
  aiBase:  { min: 5,   max: 200,    step: 5,    group: 'AI progress',       label: 'AI discoveries in 2026',     hint: '',                                                                                                                              format: v => `${v} per year` },
  human:   { min: 10,  max: 200,    step: 5,    group: 'AI progress',       label: 'Human baseline discoveries', hint: "Close to today's roughly 50 new drug approvals a year in the US.",                                                              format: v => `${v} per year` },
  reg0:    { min: 0,   max: 100,    step: 1,    group: 'Regulation',        label: 'Starting climate',           hint: 'Strict rules can cut AI growth to about a third and slow trial reform, but prevent safety scares. Hands-off rules speed both up by as much as a quarter.', format: v => { if (v < 25) return `Laissez-faire, ${v}`; if (v > 75) return `Strict, ${v}`; return `Moderate, ${v}`; } },
  vol:     { min: 0,   max: 100,    step: 1,    group: 'Regulation',        label: 'Political volatility',       hint: 'How much regulation swings on its own from year to year.',                                                                      format: v => `${v}%` },
  newBase: { min: 0,   max: 1000,   step: 10,   group: 'Diseases',          label: 'New diseases found in 2026', hint: '',                                                                                                                              format: v => `${v} per year` },
  beta:    { min: 0,   max: 100,    step: 1,    group: 'Diseases',          label: 'AI boost to finding diseases', hint: 'Detection grows with AI capability raised to this power. 0 means no boost, 1 means it keeps pace with AI.',                   format: v => `${(v / 100).toFixed(2)}` },
  pool:    { min: 5000, max: 100000, step: 1000, group: 'Diseases',         label: 'Undiscovered diseases out there', hint: 'Applies on your next new run.',                                                                                            format: v => `${v.toLocaleString('en-US')}` },
  res:     { min: 0,   max: 20,     step: 0.5,  group: 'Diseases',          label: 'Resistance chance',          hint: 'Chance an infectious disease adapts during rollout and sends researchers back to the lab.',                                      format: v => `${v}% per year` },
  spill:   { min: 0,   max: 200,    step: 5,    group: 'Events',            label: 'Platform breakthroughs',     hint: 'One technology advancing a whole disease family at once.',                                                                      format: v => `${v}% of normal` },
  pand:    { min: 0,   max: 20,     step: 0.5,  group: 'Events',            label: 'Pandemic chance',            hint: '',                                                                                                                              format: v => `${v}% per year` },
  surprise:{ min: 0,   max: 200,    step: 5,    group: 'Events',            label: 'Surprise breakthroughs',     hint: '',                                                                                                                              format: v => `${v}% of normal` },
  aging:   { min: 0,   max: 50,     step: 1,    group: 'Aging and ending',  label: 'AI effort on aging itself',  hint: 'Needed for longevity escape velocity. Curing diseases alone caps life expectancy near 90.',                                      format: v => `${v}% of AI research` },
  lemax:   { min: 80,  max: 1000,   step: 10,   group: 'Aging and ending',  label: 'Maximum life expectancy',    hint: 'Theoretical maximum life expectancy achievable through aging research.',                                                         format: v => `${v} years` },
  q0:      { min: 1,   max: 100,    step: 1,    group: 'Aging and ending',  label: 'Aging research difficulty',  hint: 'How much aging research is needed to slow aging rate toward the minimum.',                                                      format: v => `${v}` },
};

// ── Shared data types ────────────────────────────────────────────────────────

export interface YearRecord {
  y: number;
  erad: number;       // eradicated this year
  newF: number;       // new diseases found this year
  LE: number;         // life expectancy
  dLE: number;        // LE change from previous year
  dAg: number;        // aging delta this year
  C: number;          // AI capability
  reg: number;        // regulation 0-1
  rem: number;        // remaining (stages 1-3)
  eradCum: number;    // cumulative eradicated (stage 4)
  healthy: number;    // cumulative healthy years gained
  T: number;          // trial length
  p: number;          // trial success probability
  D: number;          // discoveries per year
}

export interface EventEntry {
  year: number;
  msg: string;
  kind: 'win' | 'bad' | 'plat' | 'surp' | 'ai';
}

export interface RunSummary {
  seed: number;
  outcome: 'crossover' | 'full' | 'timeout';
  endYear: number;
  crossYear: number | null;
  levYear: number | null;
  fullYear: number | null;
  eradicated: number;
  remaining: number;
  healthyYears: number;
  lifeExpectancy: number;
  pandemics: number;
  platforms: number;
  safetyScares: number;
  resistanceEvents: number;
  plateauCount: number;
  finalCapability: number;
}

// ── Presets for the setup screen ─────────────────────────────────────────────

export const GROWTH_PRESETS: Record<Params['growth'], { label: string; description: (p: Params) => string }> = {
  exp:   { label: 'Exponential',                description: p => `Compounds about ${p.g0}% a year, every year.` },
  waves: { label: 'Exponential with plateaus',   description: p => `Same rate, but AI stalls for years at a time, first at ${p.ceiling >= 1000 ? Math.round(p.ceiling).toLocaleString('en-US') : p.ceiling}× today, until a breakthrough restarts growth.` },
};

export const PRIORITY_LABELS: Record<Params['priority'], string> = {
  killers:   'Biggest killers first',
  rare:      'Neglected and rare',
  platforms: 'Platform technology',
  aging:     'Aging first',
};

export const ENGINE_VERSION = '1.1.0';
