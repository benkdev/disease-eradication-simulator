import { useEffect, useRef, useState } from 'react';
import type { RunSummary } from '@tld/engine';

interface LiveAnnouncerProps {
  currentYear: number;
  crossYear: number | null;
  levYear: number | null;
  done: boolean;
  summary: RunSummary | null;
  playing: boolean;
  speed: number;
  started: boolean;
  scenarioLabel: string;
}

/**
 * Accessible Live Announcer
 * Exposes simulation milestones and controls state to screen readers
 * via an assertive/polite aria-live region without disrupting visual UI.
 */
export function LiveAnnouncer({
  currentYear,
  crossYear,
  levYear,
  done,
  summary,
  playing,
  speed,
  started,
  scenarioLabel,
}: LiveAnnouncerProps) {
  const [message, setMessage] = useState<string>('');
  const announcedMilestonesRef = useRef<{ cross: boolean; lev: boolean; done: boolean }>({
    cross: false,
    lev: false,
    done: false,
  });
  const prevPlayingRef = useRef<boolean>(playing);
  const prevStartedRef = useRef<boolean>(started);

  // Announce simulation start
  useEffect(() => {
    if (started && !prevStartedRef.current) {
      announcedMilestonesRef.current = { cross: false, lev: false, done: false };
      setMessage(`Simulation started: ${scenarioLabel}. Starting year: 2026.`);
    }
    prevStartedRef.current = started;
  }, [started, scenarioLabel]);

  // Announce play/pause toggles
  useEffect(() => {
    if (!started) return;
    if (playing !== prevPlayingRef.current) {
      if (playing) {
        setMessage(
          `Simulation playing at ${speed} years per second. Current year: ${currentYear}.`
        );
      } else if (!done) {
        setMessage(`Simulation paused at year ${currentYear}.`);
      }
      prevPlayingRef.current = playing;
    }
  }, [playing, started, speed, currentYear, done]);

  // Announce crossover milestone
  useEffect(() => {
    if (crossYear && currentYear >= crossYear && !announcedMilestonesRef.current.cross) {
      announcedMilestonesRef.current.cross = true;
      setMessage(
        `Milestone reached: Crossover achieved in year ${crossYear}. Diseases are now being eradicated faster than new ones are discovered.`
      );
    }
  }, [currentYear, crossYear]);

  // Announce longevity escape velocity milestone
  useEffect(() => {
    if (levYear && currentYear >= levYear && !announcedMilestonesRef.current.lev) {
      announcedMilestonesRef.current.lev = true;
      setMessage(
        `Milestone reached: Longevity escape velocity achieved in year ${levYear}. Aging research is adding more than one year of life expectancy per year.`
      );
    }
  }, [currentYear, levYear]);

  // Announce completion
  useEffect(() => {
    if (done && summary && !announcedMilestonesRef.current.done) {
      announcedMilestonesRef.current.done = true;
      if (summary.outcome === 'full') {
        setMessage(
          `Simulation completed in year ${summary.endYear}: Every disease has been eradicated.`
        );
      } else if (summary.outcome === 'crossover') {
        setMessage(`Simulation completed: Crossover reached in year ${summary.endYear}.`);
      } else {
        setMessage(`Simulation ended at year ${summary.endYear}.`);
      }
    }
  }, [done, summary]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="live-announcer"
    >
      {message}
    </div>
  );
}
