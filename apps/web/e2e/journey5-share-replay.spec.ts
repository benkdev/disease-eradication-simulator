import { test, expect } from '@playwright/test';
import { SimulatorPage } from './pages/SimulatorPage.js';

test.describe('Journey 5: Collaborative Sharing, URL Deep-Linking & Seed Replay', () => {
  test.use({
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('shares simulation parameters, hydrates state from deep-link, and reproduces run', async ({
    page,
    context,
  }) => {
    const sim = new SimulatorPage(page);

    // 1. Visit app and start a simulation with plateaus preset
    await sim.goto();
    await sim.startRun('waves');
    await expect(sim.headerScenario).toHaveText('Exponential AI growth with plateaus');

    // 2. Click "Share" button to copy link and synchronize query parameters
    await expect(sim.shareBtn).toBeVisible();
    await sim.shareBtn.click();
    await expect(sim.shareBtn).toHaveText('Copied link!');

    // Verify address bar is synchronized with query params without page reload
    await expect(page).toHaveURL(/\?growth=waves/);

    // 3. Open a fresh browser tab/page with deep link (?growth=waves&seed=12345)
    const deepLinkPage = await context.newPage();
    const deepSim = new SimulatorPage(deepLinkPage);

    await deepSim.page.goto('/?growth=waves&seed=12345');

    // Verify setup modal is completely bypassed and simulation automatically begins
    await expect(deepSim.setupModal).not.toBeVisible();
    await expect(deepSim.headerScenario).toHaveText('Exponential AI growth with plateaus');
    await expect(deepSim.controlsPanel).toBeVisible();

    // Verify simulation is auto-playing past 2026
    await expect(async () => {
      const yearText = await deepSim.headerYear.textContent();
      const currentYear = parseInt(yearText || '2026', 10);
      expect(currentYear).toBeGreaterThan(2026);
    }).toPass({ timeout: 5000 });

    // Accelerate to 10x and wait for crossover
    await deepSim.setSpeed(10);
    await deepSim.waitForCrossover(30000);

    // Validate crossover milestone reached with expected seeded parameters
    await expect(deepSim.resultsModal).toBeVisible();
    await expect(deepSim.resultsTitle).toHaveText('Crossover reached');
    const modalText = await deepSim.resultsModal.textContent();
    expect(modalText).toContain('12345'); // seed 12345

    await deepLinkPage.close();
  });

  test('replays a shared run on /run/:id and allows starting a new run', async ({ page }) => {
    const sim = new SimulatorPage(page);

    // Mock API endpoint for saved run replay
    await page.route('**/api/runs/shared-seed-12345', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shared-seed-12345',
          seed: 12345,
          params: { growth: 'waves' },
        }),
      });
    });

    // Navigate to shared run URL
    await page.goto('/run/shared-seed-12345');

    // Verify replaying banner is displayed
    await expect(sim.replayingBanner).toBeVisible();
    await expect(sim.replayingBanner).toContainText('Replaying a saved or shared run');
    await expect(sim.newRunFromBannerBtn).toBeVisible();

    // Click "Start a new run of your own"
    await sim.newRunFromBannerBtn.click();

    // Verify banner is dismissed, URL reset to root, and Setup Modal is presented
    await expect(sim.replayingBanner).not.toBeVisible();
    await expect(page).toHaveURL(/^(?!.*\/run\/).*$/);
    await expect(sim.setupModal).toBeVisible();
  });
});
