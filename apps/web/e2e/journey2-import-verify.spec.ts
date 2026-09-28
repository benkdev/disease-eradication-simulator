import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SimulatorPage } from './pages/SimulatorPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Journey 2: Stored JSON Run Import & CSV Export Parity Verification', () => {
  test('pulls stored json from repository, imports it, simulates to crossover, and validates against exported csv', async ({
    page,
  }) => {
    const sim = new SimulatorPage(page);

    // 1. Read stored golden run JSON fixture from repository
    const fixturePath = path.resolve(__dirname, 'fixtures/stored-run.json');
    expect(fs.existsSync(fixturePath)).toBe(true);
    const storedJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    // 2. Visit app and open Import dialog from Setup modal
    await sim.goto();
    await expect(sim.setupModal).toBeVisible();
    await expect(sim.openImportFromSetupBtn).toBeVisible();
    await sim.openImportFromSetupBtn.click();

    // 3. Confirm ImportModal is presented
    await expect(sim.importModal).toBeVisible();
    await expect(sim.importDropzone).toBeVisible();

    // 4. Import the stored JSON file
    await sim.importFileInput.setInputFiles(fixturePath);

    // 5. Verify parsed preview card reflects stored fixture properties
    await expect(sim.importPreviewCard).toBeVisible();
    await expect(sim.importPreviewCard).toContainText(`Seed: #${storedJson.seed}`);
    await expect(sim.importPreviewCard).toContainText(`Final Year: ${storedJson.summary.endYear}`);
    await expect(sim.importPreviewCard).toContainText(`Outcome: ${storedJson.summary.outcome}`);

    // 6. Launch simulation using the imported parameters
    await expect(sim.importSimulateBtn).toBeVisible();
    await sim.importSimulateBtn.click();

    // 7. Verify modals dismiss and dashboard starts running
    await expect(sim.importModal).not.toBeVisible();
    await expect(sim.setupModal).not.toBeVisible();
    await expect(sim.header).toBeVisible();
    await expect(sim.headerScenario).toHaveText(storedJson.scenario);

    // 8. Accelerate to 10x and wait for simulation to reach the crossover milestone
    await sim.setSpeed(10);
    await sim.waitForCrossover(25000);

    // 9. Verify ResultsModal milestone year matches stored JSON summary
    await expect(sim.resultsModal).toBeVisible();
    await expect(sim.resultsTitle).toHaveText('Crossover reached');
    await expect(sim.resultsEndYear).toHaveText(String(storedJson.summary.endYear));

    // 10. Export CSV from ResultsModal and intercept download event
    await expect(sim.exportCsvBtn).toBeVisible();
    const csvDownloadPromise = page.waitForEvent('download');
    await sim.exportCsvBtn.click();
    const csvDownload = await csvDownloadPromise;

    // Verify suggested filename reflects the imported seed
    expect(csvDownload.suggestedFilename()).toBe(`tld-simulation-seed-${storedJson.seed}.csv`);

    // 11. Read exported CSV file content stream
    const csvStream = await csvDownload.createReadStream();
    expect(csvStream).not.toBeNull();
    const csvChunks: Buffer[] = [];
    if (csvStream) {
      for await (const chunk of csvStream) {
        csvChunks.push(Buffer.from(chunk));
      }
    }
    const csvContent = Buffer.concat(csvChunks).toString('utf-8');

    // 12. Compare and verify CSV results against the imported JSON fixture
    expect(csvContent).toContain('# format: tld-simulation-v1');
    expect(csvContent).toContain(`# seed: ${storedJson.seed}`);
    expect(csvContent).toContain(`# scenario: ${storedJson.scenario}`);
    expect(csvContent).toContain(`"outcome":"${storedJson.summary.outcome}"`);
    expect(csvContent).toContain(`"endYear":${storedJson.summary.endYear}`);
    expect(csvContent).toContain(`"eradicated":${storedJson.summary.eradicated}`);
    expect(csvContent).toContain(`"seed":${storedJson.seed}`);

    // Verify data rows begin at 2026 and finish at crossover year
    expect(csvContent).toContain('Year,AI_Capability,Regulation,Life_Expectancy');
    expect(csvContent).toContain('2026,');
    expect(csvContent).toContain(`${storedJson.summary.endYear},`);
  });
});
