import React, { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { LiveAnnouncer } from '../components/LiveAnnouncer';
import { Controls } from '../components/Controls';
import { StatsGrid } from '../components/StatsGrid';
import { VariableCards } from '../components/VariableCards';
import { SetupModal } from '../components/SetupModal';
import { ResultsModal } from '../components/ResultsModal';
import { MainGraph } from '../charts/MainGraph';
import { RaceChart } from '../charts/RaceChart';
import { LongevityChart } from '../charts/LongevityChart';
import { DEFAULTS, createSim, step } from '@tld/engine';

describe('Accessibility enhancements', () => {
  it('renders LiveAnnouncer with proper ARIA live attributes and announcement content', () => {
    const html = renderToString(
      <LiveAnnouncer
        currentYear={2054}
        crossYear={2054}
        levYear={2051}
        done={false}
        summary={null}
        playing={true}
        speed={4}
        started={true}
        scenarioLabel="Exponential AI growth"
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('data-testid="live-announcer"');
  });

  it('renders Controls with accessible aria-labels and group descriptions', () => {
    const html = renderToString(
      <Controls
        playing={false}
        done={false}
        speed={2}
        onTogglePlay={() => {}}
        onStepOnce={() => {}}
        onNewRun={() => {}}
        onSetSpeed={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Play simulation"');
    expect(html).toContain('aria-label="Advance simulation by one year"');
    expect(html).toContain('aria-label="Start a new simulation run"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="2 years per second"');
  });

  it('renders StatsGrid regulation meter with accessible progressbar attributes', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    step(state);
    const rec = state.hist[state.hist.length - 1];

    const html = renderToString(<StatsGrid rec={rec} />);

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Simulation annual metrics"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Regulatory climate"');
    expect(html).toContain('aria-valuenow=');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
  });

  it('renders SetupModal with accessible dialog and radiogroup attributes', () => {
    const html = renderToString(
      <SetupModal
        getParams={() => DEFAULTS}
        onStart={() => {}}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="setup-title"');
    expect(html).toContain('aria-describedby="setup-desc"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain('data-testid="growth-preset-exp"');
    expect(html).toContain('data-testid="growth-preset-waves"');
    expect(html).not.toContain('tabindex="-1"');
  });

  it('renders ResultsModal with accessible dialog attributes and labeled close button', () => {
    const summary = {
      seed: 12345,
      outcome: 'crossover' as const,
      endYear: 2054,
      crossYear: 2054,
      levYear: 2051,
      fullYear: null,
      eradicated: 5377,
      remaining: 34000,
      healthyYears: 20600000000,
      lifeExpectancy: 88.5,
      pandemics: 5,
      platforms: 3,
      safetyScares: 5,
      resistanceEvents: 2,
      plateauCount: 0,
      finalCapability: 145000,
    };

    const html = renderToString(
      <ResultsModal
        summary={summary}
        scenarioLabel="Exponential AI growth"
        onClose={() => {}}
        onKeepGoing={() => {}}
        onNewRun={() => {}}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="results-title"');
    expect(html).toContain('aria-describedby="results-summary-text"');
    expect(html).toContain('aria-label="Close results dialog"');
  });

  it('renders VariableCards toggle buttons with descriptive aria-labels', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    const rec = state.hist[0];

    const html = renderToString(
      <VariableCards rec={rec} cursorActive={false} />,
    );

    expect(html).toContain('aria-label="Toggle AI capability (log): currently shown');
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders MainGraph with accessible screen reader data summary and milestone table', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    step(state);
    const html = renderToString(
      <MainGraph
        fullHist={state.hist}
        currentYear={2027}
        plateaus={[]}
        crossYear={null}
        levYear={null}
        cursorYear={null}
        onCursorChange={() => {}}
      />,
    );

    expect(html).toContain('data-testid="main-graph-sr-summary"');
    expect(html).toContain('Simulation milestone and decadal data points');
    expect(html).toContain('Simulation Timeline Data Summary');
    expect(html).toContain('Current simulation year is 2027');
  });

  it('renders RaceChart and LongevityChart with accessible screen reader summaries', () => {
    const state = createSim({ ...DEFAULTS, seed: 12345 });
    step(state);
    const raceHtml = renderToString(
      <RaceChart fullHist={state.hist} currentYear={2027} crossYear={null} />,
    );
    expect(raceHtml).toContain('data-testid="race-chart-sr-summary"');
    expect(raceHtml).toContain('Year 2027');

    const longevityHtml = renderToString(
      <LongevityChart fullHist={state.hist} currentYear={2027} levYear={null} />,
    );
    expect(longevityHtml).toContain('data-testid="longevity-chart-sr-summary"');
    expect(longevityHtml).toContain('Year 2027');
  });
});
