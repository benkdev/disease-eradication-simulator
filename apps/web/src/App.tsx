/**
 * The Last Disease — Main Application
 * A zero-player simulation that answers: in what year will AI-driven medicine
 * eradicate diseases faster than new ones are discovered?
 */

import { useState, useCallback } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { SetupModal } from './components/SetupModal';
import { ResultsModal } from './components/ResultsModal';
import { Header } from './components/Header';
import { MainGraph } from './charts/MainGraph';
import { VariableCards, VARIABLE_DEFS } from './components/VariableCards';
import { Controls } from './components/Controls';
import { StatsGrid } from './components/StatsGrid';
import { RaceChart } from './charts/RaceChart';
import { LongevityChart } from './charts/LongevityChart';
import { EventLog } from './components/EventLog';
import { SettingsPanel } from './components/SettingsPanel';
import { HowItWorks } from './components/HowItWorks';
import { LiveAnnouncer } from './components/LiveAnnouncer';

export default function App() {
  const sim = useSimulation();
  const [enabledVars, setEnabledVars] = useState<boolean[]>(() =>
    VARIABLE_DEFS.map(d => d.defaultOn)
  );

  const toggleVar = useCallback((idx: number) => {
    setEnabledVars(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }, []);

  const hasStarted = !sim.showSetup;

  return (
    <div className="app-container">
      {/* Accessible skip link for keyboard navigation */}
      <a href="#main-controls" className="skip-link">
        Skip to simulation controls
      </a>

      {/* Screen reader live announcements */}
      <LiveAnnouncer
        currentYear={sim.currentYear}
        crossYear={sim.crossYear}
        levYear={sim.levYear}
        done={sim.done}
        summary={sim.summary}
        playing={sim.playing}
        speed={sim.speed}
        started={hasStarted}
        scenarioLabel={sim.scenarioLabel}
      />

      {sim.replayingBanner && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            marginBottom: 12,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            fontSize: '0.85rem',
          }}
        >
          <span>Replaying a shared run</span>
          <button onClick={sim.newRun} style={{ fontSize: '0.8rem', padding: '4px 12px', minHeight: 30 }}>
            Start a new run of your own
          </button>
        </div>
      )}

      <Header
        scenarioLabel={sim.scenarioLabel}
        year={sim.currentYear}
        C={sim.displayRec?.C ?? 1}
        started={hasStarted}
      />

      <main id="main-content">
        {hasStarted && (
          <>
            <MainGraph
              fullHist={sim.fullHist}
              currentYear={sim.currentYear}
              plateaus={sim.plateaus}
              crossYear={sim.crossYear}
              levYear={sim.levYear}
              cursorYear={sim.cursorYear}
              onCursorChange={sim.setCursorYear}
              enabledVars={enabledVars}
            />

            <p className="hint" style={{ margin: '6px 0 12px' }}>
              Each line is scaled to its full-run range. Shaded bands mark AI plateaus.
              Tap a variable to show or hide it, and touch the graph to read any year.
            </p>

            <VariableCards
              rec={sim.displayRec}
              cursorActive={sim.cursorYear !== null}
              enabled={enabledVars}
              onToggle={toggleVar}
            />

            <div id="main-controls">
              <Controls
                playing={sim.playing}
                done={sim.done}
                speed={sim.speed}
                onTogglePlay={sim.togglePlay}
                onStepOnce={sim.stepOnce}
                onNewRun={sim.newRun}
                onSetSpeed={sim.setSpeed}
              />
            </div>

            <StatsGrid rec={sim.displayRec} />

            <RaceChart
              fullHist={sim.fullHist}
              currentYear={sim.currentYear}
              crossYear={sim.crossYear}
            />

            <LongevityChart
              fullHist={sim.fullHist}
              currentYear={sim.currentYear}
              levYear={sim.levYear}
            />

            <EventLog
              events={sim.eventsAll}
              currentYear={sim.currentYear}
            />
          </>
        )}

        <SettingsPanel
          getParams={sim.getParams}
          updateParam={sim.updateParam}
        />

        <HowItWorks />
      </main>

      {sim.showSetup && (
        <SetupModal
          getParams={sim.getParams}
          onStart={sim.startRun}
        />
      )}

      {sim.showResults && sim.summary && (
        <ResultsModal
          summary={sim.summary}
          scenarioLabel={sim.scenarioLabel}
          onClose={sim.closeResults}
          onKeepGoing={sim.keepGoing}
          onNewRun={sim.newRun}
        />
      )}
    </div>
  );
}
