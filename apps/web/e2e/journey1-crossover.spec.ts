import { test, expect } from '@playwright/test';
import { SimulatorPage } from './pages/SimulatorPage.js';

test.describe('Journey 1: Complete Simulation Lifecycle (Setup -> Crossover -> Full Eradication -> Reset)', () => {
  test('launches simulation, advances through crossover, continues to full eradication, and resets', async ({
    page,
  }) => {
    const sim = new SimulatorPage(page);

    // 1. Visit app and verify setup modal is presented
    await sim.goto();
    await expect(sim.setupModal).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Disease Eradication Simulator' })
    ).toBeVisible();
    await expect(sim.growthExpOption).toBeVisible();
    await expect(sim.growthWavesOption).toBeVisible();

    // 2. Start simulation with Exponential AI growth
    await sim.startRun('exp');

    // 3. Confirm dashboard renders and simulation starts from 2026
    await expect(sim.header).toBeVisible();
    await expect(sim.headerYear).toBeVisible();
    const startYear = parseInt((await sim.headerYear.textContent()) || '0', 10);
    expect(startYear).toBeGreaterThanOrEqual(2026);
    await expect(sim.headerScenario).toHaveText('Exponential AI growth');
    await expect(sim.graphCanvas).toBeVisible();
    await expect(sim.controlsPanel).toBeVisible();
    await expect(sim.variableCards).toBeVisible();

    // 4. Accelerate playback to 10x to simulate efficiently
    await sim.setSpeed(10);

    // 5. Verify the simulation advances past 2026
    await expect(async () => {
      const yearText = await sim.headerYear.textContent();
      const currentYear = parseInt(yearText || '2026', 10);
      expect(currentYear).toBeGreaterThan(2026);
    }).toPass({ timeout: 5000 });

    // 6. Wait for simulation to pause at the crossover milestone
    await sim.waitForCrossover(35000);

    // 7. Validate Crossover Results Modal content
    await expect(sim.resultsTitle).toHaveText('Crossover reached');
    const crossYearText = await sim.resultsEndYear.textContent();
    const crossYear = parseInt(crossYearText || '0', 10);
    expect(crossYear).toBeGreaterThanOrEqual(2045);
    expect(crossYear).toBeLessThanOrEqual(2065);

    // Validate key outcome rows are displayed
    await expect(sim.resultsModal.getByText('Diseases eradicated')).toBeVisible();
    await expect(sim.resultsModal.getByText('Still in progress')).toBeVisible();
    await expect(sim.resultsModal.getByText('Healthy years gained')).toBeVisible();
    await expect(sim.resultsModal.getByText('Life expectancy')).toBeVisible();
    await expect(sim.keepGoingBtn).toBeVisible();

    // 8. Click "Keep going to full eradication" to simulate all the way to the end
    await sim.keepGoingBtn.click();

    // 9. Results modal dismisses and playback resumes toward the terminal milestone
    await expect(sim.resultsModal).not.toBeVisible();
    await expect(sim.playPauseBtn).not.toBeDisabled();

    // 10. Wait for terminal milestone: Every disease eradicated (~2075-2090)
    await sim.waitForFullEradication(45000);

    // 11. Validate terminal state in Results Modal
    await expect(sim.resultsTitle).toHaveText('Every disease eradicated');
    const terminalYearText = await sim.resultsEndYear.textContent();
    const terminalYear = parseInt(terminalYearText || '0', 10);
    expect(terminalYear).toBeGreaterThanOrEqual(2060);
    expect(terminalYear).toBeLessThanOrEqual(2100);

    // Life expectancy reaches maximum ceiling (~500 years)
    const modalText = await sim.resultsModal.textContent();
    expect(modalText).toMatch(/Life expectancy\s*49\d(\.\d)?\s*yrs/);

    // "Keep going" button should no longer exist since full eradication was achieved
    await expect(sim.keepGoingBtn).not.toBeVisible();

    // 12. Dismiss results modal via close button and verify completed dashboard state
    await sim.resultsCloseBtn.click();
    await expect(sim.resultsModal).not.toBeVisible();
    await expect(sim.controlsPanel).toBeVisible();
    await expect(sim.playPauseBtn).toBeDisabled();

    // 13. Click "New run" to verify clean reset back to initial setup modal
    await sim.newRunBtn.click();
    await expect(sim.setupModal).toBeVisible();
    await expect(sim.controlsPanel).not.toBeVisible();
  });
});
