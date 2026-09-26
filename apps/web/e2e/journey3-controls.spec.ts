import { test, expect } from '@playwright/test';
import { SimulatorPage } from './pages/SimulatorPage.js';

test.describe('Journey 3: Simulator Controls, Stepping & Interactive Exploration', () => {
  test('pauses, steps year-by-year, changes speed, toggles variables, and inspects settings', async ({ page }) => {
    const sim = new SimulatorPage(page);

    // 1. Start simulation
    await sim.goto();
    await sim.startRun('waves'); // Test "Exponential with plateaus" preset
    await expect(sim.headerScenario).toHaveText('Exponential AI growth with plateaus');

    // 2. Pause playback
    await expect(sim.playPauseBtn).toHaveText('Pause');
    await sim.playPauseBtn.click();
    await expect(sim.playPauseBtn).toHaveText('Play');

    // Record paused year
    const yearPausedText = await sim.headerYear.textContent();
    const pausedYear = parseInt(yearPausedText || '2026', 10);

    // Wait 500ms to confirm the year does NOT advance while paused
    await page.waitForTimeout(500);
    expect(await sim.headerYear.textContent()).toBe(String(pausedYear));

    // 3. Step forward year-by-year deterministically using "+1 year"
    await sim.stepOnceBtn.click();
    await expect(sim.headerYear).toHaveText(String(pausedYear + 1));

    await sim.stepOnceBtn.click();
    await expect(sim.headerYear).toHaveText(String(pausedYear + 2));

    await sim.stepOnceBtn.click();
    await expect(sim.headerYear).toHaveText(String(pausedYear + 3));

    // 4. Test speed control toggles
    for (const s of [1, 2, 4, 10] as const) {
      await sim.setSpeed(s);
      const btn = page.getByTestId(`speed-btn-${s}`);
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
    }

    // 5. Test variable card toggles
    const leCard = sim.getVarCard('LE');
    await expect(leCard).toHaveAttribute('aria-pressed', 'true');
    await leCard.click();
    await expect(leCard).toHaveAttribute('aria-pressed', 'false');
    await leCard.click();
    await expect(leCard).toHaveAttribute('aria-pressed', 'true');

    // Test second variable toggle (Diseases remaining)
    const remCard = sim.getVarCard('rem');
    await expect(remCard).toHaveAttribute('aria-pressed', 'true');
    await remCard.click();
    await expect(remCard).toHaveAttribute('aria-pressed', 'false');

    // 6. Test Canvas interaction / scrubbing
    const canvasBox = await sim.graphCanvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (canvasBox) {
      // Hover across canvas
      await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.5);
      await page.waitForTimeout(200);
    }

    // 7. Test Settings Panel inspection
    await expect(sim.settingsPanel).toBeVisible();
    await sim.settingsSummary.click(); // Expand details
    await expect(sim.settingsPanel).toHaveAttribute('open', '');

    // Verify key Gompertz-Makeham & simulation parameters in the settings panel
    await expect(sim.settingsPanel.getByText('Maximum life expectancy', { exact: true })).toBeVisible();
    await expect(sim.settingsPanel.getByText('500 years')).toBeVisible();
    await expect(sim.settingsPanel.getByText('Aging research difficulty', { exact: true })).toBeVisible();
    await expect(sim.settingsPanel.getByText('20', { exact: true })).toBeVisible();

    // 8. Test New Run reset
    await sim.newRunBtn.click();
    await expect(sim.setupModal).toBeVisible();
    await expect(sim.controlsPanel).not.toBeVisible();
  });
});
