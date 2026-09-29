import { test, expect } from '@playwright/test';
import { SimulatorPage } from './pages/SimulatorPage.js';

test.describe('Journey 4: Multi-Format Data & Chart Export Pipeline', () => {
  test('reaches crossover and exports CSV, JSON, and PNG with full metadata integrity', async ({
    page,
  }) => {
    const sim = new SimulatorPage(page);

    // 1. Launch simulator and accelerate to crossover
    await sim.goto();
    await sim.startRun('exp');
    await sim.setSpeed(10);
    await sim.waitForCrossover(25000);

    // Verify Results Modal export section is visible
    await expect(sim.resultsModal).toBeVisible();
    await expect(sim.exportCsvBtn).toBeVisible();
    await expect(sim.exportJsonBtn).toBeVisible();
    await expect(sim.exportPngBtn).toBeVisible();

    // 2. Validate CSV Export
    const csvDownloadPromise = page.waitForEvent('download');
    await sim.exportCsvBtn.click();
    const csvDownload = await csvDownloadPromise;

    expect(csvDownload.suggestedFilename()).toMatch(/^tld-simulation-seed-\d+\.csv$/);

    const csvStream = await csvDownload.createReadStream();
    expect(csvStream).not.toBeNull();
    const csvChunks: Buffer[] = [];
    if (csvStream) {
      for await (const chunk of csvStream) {
        csvChunks.push(Buffer.from(chunk));
      }
    }
    const csvContent = Buffer.concat(csvChunks).toString('utf-8');

    // Validate 1:1 metadata comment headers
    expect(csvContent).toContain('# format: tld-simulation-v1');
    expect(csvContent).toContain('# scenario: Exponential AI growth');
    expect(csvContent).toMatch(/# seed: \d+/);
    expect(csvContent).toContain('# summary:');
    expect(csvContent).toContain('# params:');

    // Validate CSV column headers and first simulation row
    expect(csvContent).toContain('Year,AI_Capability,Regulation,Life_Expectancy');
    expect(csvContent).toContain('2026,');

    // 3. Validate JSON Export
    const jsonDownloadPromise = page.waitForEvent('download');
    await sim.exportJsonBtn.click();
    const jsonDownload = await jsonDownloadPromise;

    expect(jsonDownload.suggestedFilename()).toMatch(/^tld-simulation-seed-\d+\.json$/);

    const jsonStream = await jsonDownload.createReadStream();
    expect(jsonStream).not.toBeNull();
    const jsonChunks: Buffer[] = [];
    if (jsonStream) {
      for await (const chunk of jsonStream) {
        jsonChunks.push(Buffer.from(chunk));
      }
    }
    const jsonContent = Buffer.concat(jsonChunks).toString('utf-8');
    const parsedJSON = JSON.parse(jsonContent);

    // Validate JSON schema and parity with CSV metadata
    expect(parsedJSON.format).toBe('tld-simulation-v1');
    expect(parsedJSON.scenario).toBe('Exponential AI growth');
    expect(typeof parsedJSON.seed).toBe('number');
    expect(parsedJSON.summary).toBeDefined();
    expect(parsedJSON.summary.outcome).toBe('crossover');
    expect(parsedJSON.params).toBeDefined();
    expect(Array.isArray(parsedJSON.history)).toBe(true);
    expect(parsedJSON.history.length).toBeGreaterThan(0);
    expect(parsedJSON.history[0].y).toBe(2026);

    // 4. Validate Composite Chart PNG Export
    const pngDownloadPromise = page.waitForEvent('download');
    await sim.exportPngBtn.click();
    const pngDownload = await pngDownloadPromise;

    expect(pngDownload.suggestedFilename()).toBe('tld-simulation-chart.png');

    const pngStream = await pngDownload.createReadStream();
    expect(pngStream).not.toBeNull();
    const pngChunks: Buffer[] = [];
    if (pngStream) {
      for await (const chunk of pngStream) {
        pngChunks.push(Buffer.from(chunk));
      }
    }
    const pngBuffer = Buffer.concat(pngChunks);

    // Validate valid PNG binary signature: 0x89 0x50 0x4E 0x47
    expect(pngBuffer.length).toBeGreaterThan(500);
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50); // 'P'
    expect(pngBuffer[2]).toBe(0x4e); // 'N'
    expect(pngBuffer[3]).toBe(0x47); // 'G'
  });
});
