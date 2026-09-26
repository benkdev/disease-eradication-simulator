/**
 * Engine adapter for apps/web.
 * Re-exports from @tld/engine and provides simulate() and seriesBounds()
 * with fallbacks if packages/engine has not yet merged them in the local environment.
 */
import * as Engine from '@tld/engine';

export * from '@tld/engine';

export interface SeriesBound {
  min: number;
  max: number;
  logMin?: number;
  logMax?: number;
  lo?: number;
  hi?: number;
}

export type SeriesBoundsMap = Record<string, SeriesBound>;

export interface SimResult {
  params: Engine.Params;
  hist: Engine.YearRecord[];
  eventsAll: Engine.EventEntry[];
  plateaus: [number, number | null][];
  crossYear: number | null;
  levYear: number | null;
  fullYear: number | null;
  year: number;
  done: boolean;
  summary: Engine.RunSummary;
}

export function simulate(params: Engine.Params): SimResult {
  const engineModule = Engine as Record<string, unknown>;
  if (typeof engineModule['simulate'] === 'function') {
    const fn = engineModule['simulate'] as (p: Engine.Params) => any;
    const res = fn(params);
    const summary = res.summary ?? (typeof engineModule['summarize'] === 'function' ? (engineModule['summarize'] as any)(res) : Engine.summarize(res));
    const eventsAll = res.eventsAll ?? res.events ?? [];
    const hist = res.hist;
    return {
      params: res.params ?? params,
      hist,
      eventsAll,
      plateaus: res.plateaus ?? [],
      crossYear: res.crossYear ?? null,
      levYear: res.levYear ?? null,
      fullYear: res.fullYear ?? null,
      year: res.year ?? (hist.length > 0 ? hist[hist.length - 1].y : 2026),
      done: res.done ?? true,
      summary,
    };
  }

  // Fallback using createSim and step
  const state = Engine.createSim(params);
  const eventsAll: Engine.EventEntry[] = [...state.events];

  while (!state.done) {
    Engine.step(state);
    for (const ev of state.events) {
      if (ev.year === state.year && !eventsAll.includes(ev)) {
        eventsAll.push(ev);
      }
    }
  }

  const hist = state.hist;
  const rawSummary = Engine.summarize(state);

  return {
    params: state.params,
    hist,
    eventsAll,
    plateaus: state.plateaus,
    crossYear: state.crossYear,
    levYear: state.levYear,
    fullYear: state.fullYear,
    year: state.year,
    done: state.done,
    summary: rawSummary,
  };
}

export function seriesBounds(fullHist: Engine.YearRecord[]): SeriesBoundsMap {
  const engineModule = Engine as Record<string, unknown>;
  if (typeof engineModule['seriesBounds'] === 'function') {
    return (engineModule['seriesBounds'] as (h: Engine.YearRecord[]) => SeriesBoundsMap)(fullHist);
  }

  const map: SeriesBoundsMap = {};
  if (!fullHist || fullHist.length === 0) return map;

  const sample = fullHist[0];
  const keys = Object.keys(sample) as (keyof Engine.YearRecord)[];
  for (const k of keys) {
    if (typeof sample[k] !== 'number') continue;
    const vals = fullHist.map(r => r[k] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pos = vals.filter(v => v > 0);
    const logMin = pos.length > 0 ? Math.log10(Math.max(1, Math.min(...pos))) : 0;
    const logMax = Math.log10(Math.max(1, max));
    map[k] = { min, max, logMin, logMax, lo: min, hi: max };
  }
  return map;
}
