/**
 * useSimulation — manages the simulation lifecycle, animation loop, and state.
 * Precomputes each run at the start using simulate(params), then animates year
 * by year with a playback cursor pinned to the full run's range.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  simulate,
  DEFAULTS,
  type Params,
  type SimState,
  type RunSummary,
  type YearRecord,
  type EventEntry,
  type SimResult,
} from '../engine';
import { paramsFromQueryString, syncParamsToUrl } from '../utils/urlState';
import type { SimulationExportPayload } from '../utils/exportData';

export interface SimController {
  result: SimResult | null;
  state: SimState | null; // Compatibility bridge
  fullHist: YearRecord[];
  currentYear: number;
  finalYear: number;
  currentRec: YearRecord | null;
  displayRec: YearRecord | null;
  eventsAll: EventEntry[];
  plateaus: [number, number | null][];
  crossYear: number | null;
  levYear: number | null;

  playing: boolean;
  speed: number;
  done: boolean;
  summary: RunSummary | null;
  showSetup: boolean;
  showResults: boolean;
  cursorYear: number | null;
  scenarioLabel: string;
  replayingBanner: boolean;

  setSpeed: (s: number) => void;
  setCursorYear: (y: number | null) => void;
  startRun: (growth: Params['growth'], endAtCross?: boolean) => void;
  togglePlay: () => void;
  stepOnce: () => void;
  newRun: () => void;
  closeResults: () => void;
  keepGoing: () => void;
  getParams: () => Params;
  updateParam: <K extends keyof Params>(key: K, value: Params[K]) => void;
  importAndReplay: (payload: SimulationExportPayload) => void;
  importAndSimulate: (payload: SimulationExportPayload, chosenGrowth: Params['growth']) => void;
}

export function useSimulation(): SimController {
  const [result, setResult] = useState<SimResult | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [cursorYear, setCursorYear] = useState<number | null>(null);
  const [scenarioLabel, setScenarioLabel] = useState('');
  const [replayingBanner, setReplayingBanner] = useState(false);

  const paramsRef = useRef<Params>(
    typeof window !== 'undefined' && window.location.search
      ? paramsFromQueryString(window.location.search)
      : { ...DEFAULTS }
  );
  const resultRef = useRef<SimResult | null>(null);
  const currentYearRef = useRef<number>(2026);
  const playingRef = useRef(false);
  const speedRef = useRef(2);
  const doneRef = useRef(false);
  const accumRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);
  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  // Animation playback loop
  const animate = useCallback((time: number) => {
    if (!playingRef.current || doneRef.current || !resultRef.current) {
      rafRef.current = 0;
      return;
    }

    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.25);
    lastTimeRef.current = time;
    accumRef.current += dt;

    const interval = 1 / speedRef.current;
    const finalYear = resultRef.current.year;

    let updatedYear = currentYearRef.current;
    let finished = false;

    while (accumRef.current >= interval) {
      accumRef.current -= interval;
      if (updatedYear < finalYear) {
        updatedYear += 1;
      }
      if (updatedYear >= finalYear) {
        finished = true;
        break;
      }
    }

    if (updatedYear !== currentYearRef.current) {
      currentYearRef.current = updatedYear;
      setCurrentYear(updatedYear);
    }

    if (finished) {
      doneRef.current = true;
      playingRef.current = false;
      setDone(true);
      setPlaying(false);
      setShowResults(true);
      rafRef.current = 0;
      return;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (playing && !done && resultRef.current) {
      lastTimeRef.current = 0;
      accumRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, done, animate]);

  const handleSetSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  const startRun = useCallback((growth: Params['growth'], endAtCross: boolean = true) => {
    paramsRef.current.growth = growth;
    paramsRef.current.endAtCross = endAtCross;
    syncParamsToUrl(paramsRef.current);
    const res = simulate(paramsRef.current);
    resultRef.current = res;
    setResult(res);
    setSummary(res.summary);
    currentYearRef.current = 2026;
    setCurrentYear(2026);
    setDone(false);
    doneRef.current = false;
    setShowSetup(false);
    setShowResults(false);
    setCursorYear(null);
    setPlaying(true);
    playingRef.current = true;
    lastTimeRef.current = 0;
    accumRef.current = 0;
    setScenarioLabel(
      growth === 'exp' ? 'Exponential AI growth' : 'Exponential AI growth with plateaus'
    );
  }, []);

  const togglePlay = useCallback(() => {
    if (doneRef.current) return;
    setPlaying((p) => {
      const next = !p;
      playingRef.current = next;
      return next;
    });
  }, []);

  const stepOnce = useCallback(() => {
    if (!resultRef.current || doneRef.current) return;
    setPlaying(false);
    playingRef.current = false;
    const finalYear = resultRef.current.year;
    if (currentYearRef.current < finalYear) {
      const nextYear = currentYearRef.current + 1;
      currentYearRef.current = nextYear;
      setCurrentYear(nextYear);
      if (nextYear >= finalYear) {
        doneRef.current = true;
        setDone(true);
        setShowResults(true);
      }
    }
  }, []);

  const newRun = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    playingRef.current = false;
    setDone(false);
    doneRef.current = false;
    setSummary(null);
    setShowResults(false);
    setShowSetup(true);
    setCursorYear(null);
    setReplayingBanner(false);
    if (window.location.pathname.startsWith('/run/')) {
      window.history.pushState(null, '', '/');
    } else if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const closeResults = useCallback(() => {
    setShowResults(false);
  }, []);

  const keepGoing = useCallback(() => {
    if (!resultRef.current) return;
    paramsRef.current.endAtCross = false;
    const nextParams: Params = {
      ...resultRef.current.params,
      endAtCross: false,
    };
    syncParamsToUrl(nextParams);
    const res = simulate(nextParams);
    resultRef.current = res;
    setResult(res);
    setSummary(res.summary);
    doneRef.current = false;
    playingRef.current = true;
    setDone(false);
    setShowResults(false);
    setPlaying(true);
    lastTimeRef.current = 0;
    accumRef.current = 0;
  }, []);

  const getParams = useCallback(() => ({ ...paramsRef.current }), []);

  // Settings changes apply to the next run, not the run in progress
  const updateParam = useCallback(<K extends keyof Params>(key: K, value: Params[K]) => {
    paramsRef.current[key] = value;
    syncParamsToUrl(paramsRef.current);
  }, []);

  const importAndReplay = useCallback((payload: SimulationExportPayload) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const resolvedSeed = Number(payload.seed ?? payload.summary?.seed ?? payload.params?.seed) || 0;
    const hist = payload.history;
    const finalYear = hist.length > 0 ? hist[hist.length - 1].y : 2026;
    const summary = payload.summary ?? {
      seed: resolvedSeed,
      outcome: hist[hist.length - 1]?.rem === 0 ? 'full' : 'crossover',
      endYear: finalYear,
      crossYear: null,
      levYear: null,
      fullYear: null,
      eradicated: hist[hist.length - 1]?.eradCum ?? 0,
      remaining: hist[hist.length - 1]?.rem ?? 0,
      healthyYears: Math.round(hist[hist.length - 1]?.healthy ?? 0),
      lifeExpectancy: hist[hist.length - 1]?.LE ?? 73,
      pandemics: 0,
      platforms: 0,
      safetyScares: 0,
      resistanceEvents: 0,
      plateauCount: 0,
      finalCapability: hist[hist.length - 1]?.C ?? 1,
    };

    const mockResult: SimResult = {
      params: payload.params ?? { ...DEFAULTS, seed: resolvedSeed },
      hist,
      eventsAll: [],
      plateaus: [],
      crossYear: summary.crossYear ?? null,
      levYear: summary.levYear ?? null,
      fullYear: summary.fullYear ?? null,
      year: finalYear,
      done: true,
      summary,
    };

    resultRef.current = mockResult;
    paramsRef.current = mockResult.params;
    setResult(mockResult);
    setSummary(summary);
    currentYearRef.current = finalYear;
    setCurrentYear(finalYear);
    setDone(true);
    doneRef.current = true;
    setPlaying(false);
    playingRef.current = false;
    setShowSetup(false);
    setShowResults(false);
    setCursorYear(null);
    setReplayingBanner(true);
    setScenarioLabel(payload.scenario || 'Imported simulation run');
  }, []);

  const importAndSimulate = useCallback(
    (payload: SimulationExportPayload, chosenGrowth: Params['growth']) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const seedNum = Number(payload.seed ?? payload.summary?.seed ?? payload.params?.seed) || 0;
      const baseParams: Params = payload.params
        ? { ...payload.params }
        : { ...DEFAULTS, seed: seedNum };
      baseParams.growth = chosenGrowth;
      if (seedNum > 0) baseParams.seed = seedNum;
      baseParams.endAtCross = payload.params?.endAtCross ?? true;
      paramsRef.current = baseParams;
      setReplayingBanner(false);
      startRun(chosenGrowth, baseParams.endAtCross);
    },
    [startRun]
  );

  // Replay shared run on /run/:id
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/run/')) {
      const id = path.replace('/run/', '').split('/')[0];
      if (id) {
        fetch(`/api/runs/${id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.params) {
              paramsRef.current = { ...data.params };
              if (data.seed !== undefined) paramsRef.current.seed = data.seed;
              paramsRef.current.endAtCross = true;
              setSpeed(10);
              speedRef.current = 10;
              setReplayingBanner(true);
              const res = simulate(paramsRef.current);
              resultRef.current = res;
              setResult(res);
              setSummary(res.summary);
              currentYearRef.current = 2026;
              setCurrentYear(2026);
              setDone(false);
              doneRef.current = false;
              setShowSetup(false);
              setShowResults(false);
              setCursorYear(null);
              setPlaying(true);
              playingRef.current = true;
              lastTimeRef.current = 0;
              accumRef.current = 0;
              setScenarioLabel(
                paramsRef.current.growth === 'exp'
                  ? 'Exponential AI growth'
                  : 'Exponential AI growth with plateaus'
              );
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  // Load shared simulation from URL search params on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const parsed = paramsFromQueryString(window.location.search);
      paramsRef.current = parsed;
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('growth') || urlParams.has('seed')) {
        startRun(parsed.growth, parsed.endAtCross);
      }
    }
  }, [startRun]);

  const fullHist = result?.hist ?? [];
  const finalYear = result?.year ?? 2026;
  const currentRec =
    fullHist.find((r) => r.y === currentYear) ?? (fullHist.length > 0 ? fullHist[0] : null);
  const cursorRec = cursorYear !== null ? (fullHist.find((r) => r.y === cursorYear) ?? null) : null;
  const displayRec = cursorRec ?? currentRec;
  const eventsAll = result?.eventsAll ?? [];
  const plateaus = result?.plateaus ?? [];
  const crossYear = result?.crossYear ?? null;
  const levYear = result?.levYear ?? null;

  // Compatibility bridge for state
  const state: SimState | null = result ? (result as unknown as SimState) : null;

  return {
    result,
    state,
    fullHist,
    currentYear,
    finalYear,
    currentRec,
    displayRec,
    eventsAll,
    plateaus,
    crossYear,
    levYear,
    playing,
    speed,
    done,
    summary,
    showSetup,
    showResults,
    cursorYear,
    scenarioLabel,
    replayingBanner,
    setSpeed: handleSetSpeed,
    setCursorYear,
    startRun,
    togglePlay,
    stepOnce,
    newRun,
    closeResults,
    keepGoing,
    getParams,
    updateParam,
    importAndReplay,
    importAndSimulate,
  };
}
