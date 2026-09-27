import { test, expect } from '@playwright/test';
import { SimulatorPage } from './pages/SimulatorPage.js';

test.describe('Journey 2: Deep Longevity Horizon (Crossover -> Keep Going -> Full Eradication)', () => {
  test('extends simulation past crossover to full eradication and ~500-year longevity', async ({
    page,
  }) => {
    const sim = new SimulatorPage(page);

    // 1. Start simulation at 10x speed to reach crossover rapidly
    await sim.goto();
    await sim.startRun('exp');
    await sim.setSpeed(10);

    // 2. Wait for crossover milestone
    await sim.waitForCrossover(25000);

    // 3. Click "Keep going to full eradication"
    await expect(sim.keepGoingBtn).toBeVisible();
    await sim.keepGoingBtn.click();

    // 4. Modal should dismiss and simulation should resume playing toward full eradication
    await expect(sim.resultsModal).not.toBeVisible();
    await expect(sim.playPauseBtn).not.toBeDisabled();

    // 5. Wait for full eradication milestone (outcome: 'full')
    await sim.waitForFullEradication(35000);

    // 6. Validate terminal state in Results Modal
    await expect(sim.resultsTitle).toHaveText('Every disease eradicated');

    // End year should be around 2075-2085
    const endYearText = await sim.resultsEndYear.textContent();
    const endYear = parseInt(endYearText || '0', 10);
    expect(endYear).toBeGreaterThanOrEqual(2070);
    expect(endYear).toBeLessThanOrEqual(2100);

    // 0 diseases remaining
    await expect(sim.resultsModal.getByText('Still in progress')).toBeVisible();

    // Life expectancy near 500 years
    const modalText = await sim.resultsModal.textContent();
    expect(modalText).toMatch(/Life expectancy\s*49\d(\.\d)?\s*yrs/);

    // "Keep going" button should no longer exist since full eradication was achieved
    await expect(sim.keepGoingBtn).not.toBeVisible();

    // 7. Click "New run" to confirm clean reset back to initial setup modal
    await sim.resultsNewRunBtn.click();
    await expect(sim.resultsModal).not.toBeVisible();
    await expect(sim.setupModal).toBeVisible();
  });
});
