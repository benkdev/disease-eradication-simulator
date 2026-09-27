import { test, expect } from '@playwright/test';
import { SimulatorPage } from './pages/SimulatorPage.js';

test.describe('Journey 1: Primary Simulation Lifecycle (Setup -> Crossover -> Results Validation)', () => {
  test('launches simulation, advances to crossover milestone, and inspects results', async ({
    page,
  }) => {
    const sim = new SimulatorPage(page);

    // 1. Visit app and verify setup modal is presented
    await sim.goto();
    await expect(sim.setupModal).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How does AI grow?' })).toBeVisible();
    await expect(sim.growthExpOption).toBeVisible();
    await expect(sim.growthWavesOption).toBeVisible();

    // 2. Start simulation with Exponential AI growth
    await sim.startRun('exp');

    // 3. Confirm dashboard renders and simulation starts at 2026
    await expect(sim.header).toBeVisible();
    await expect(sim.headerYear).toHaveText('2026');
    await expect(sim.headerScenario).toHaveText('Exponential AI growth');
    await expect(sim.graphCanvas).toBeVisible();
    await expect(sim.controlsPanel).toBeVisible();
    await expect(sim.variableCards).toBeVisible();

    // 4. Accelerate playback to 10x to reach crossover efficiently
    await sim.setSpeed(10);

    // 5. Verify the simulation advances past 2026
    await expect(async () => {
      const yearText = await sim.headerYear.textContent();
      const currentYear = parseInt(yearText || '2026', 10);
      expect(currentYear).toBeGreaterThan(2026);
    }).toPass({ timeout: 5000 });

    // 6. Wait for simulation to finish at the crossover milestone
    await sim.waitForCrossover(25000);

    // 7. Validate Results Modal content
    await expect(sim.resultsTitle).toHaveText('Crossover reached');
    const endYearText = await sim.resultsEndYear.textContent();
    const endYear = parseInt(endYearText || '0', 10);
    expect(endYear).toBeGreaterThanOrEqual(2045);
    expect(endYear).toBeLessThanOrEqual(2065);

    // Validate key outcome rows are displayed
    await expect(sim.resultsModal.getByText('Diseases eradicated')).toBeVisible();
    await expect(sim.resultsModal.getByText('Still in progress')).toBeVisible();
    await expect(sim.resultsModal.getByText('Healthy years gained')).toBeVisible();
    await expect(sim.resultsModal.getByText('Life expectancy')).toBeVisible();
    await expect(sim.keepGoingBtn).toBeVisible();

    // 8. Dismiss results modal via close button and verify dashboard remains intact
    await sim.resultsCloseBtn.click();
    await expect(sim.resultsModal).not.toBeVisible();
    await expect(sim.controlsPanel).toBeVisible();
    await expect(sim.playPauseBtn).toBeDisabled(); // simulation is complete
  });
});
