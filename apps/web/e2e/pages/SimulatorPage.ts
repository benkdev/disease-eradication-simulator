import { expect, type Locator, type Page } from '@playwright/test';

export class SimulatorPage {
  readonly page: Page;

  // Setup Modal
  readonly setupModal: Locator;
  readonly growthExpOption: Locator;
  readonly growthWavesOption: Locator;
  readonly startRunBtn: Locator;

  // Header
  readonly header: Locator;
  readonly headerYear: Locator;
  readonly headerCapability: Locator;
  readonly headerScenario: Locator;

  // Controls
  readonly controlsPanel: Locator;
  readonly playPauseBtn: Locator;
  readonly stepOnceBtn: Locator;
  readonly newRunBtn: Locator;
  readonly speedBtn1: Locator;
  readonly speedBtn2: Locator;
  readonly speedBtn4: Locator;
  readonly speedBtn10: Locator;

  // Variable Cards & Canvas
  readonly variableCards: Locator;
  readonly graphCanvas: Locator;

  // Results Modal
  readonly resultsModal: Locator;
  readonly resultsTitle: Locator;
  readonly resultsEndYear: Locator;
  readonly keepGoingBtn: Locator;
  readonly resultsNewRunBtn: Locator;
  readonly resultsCloseBtn: Locator;

  // Settings
  readonly settingsPanel: Locator;
  readonly settingsSummary: Locator;

  constructor(page: Page) {
    this.page = page;

    this.setupModal = page.getByTestId('setup-modal');
    this.growthExpOption = page.getByTestId('growth-preset-exp');
    this.growthWavesOption = page.getByTestId('growth-preset-waves');
    this.startRunBtn = page.getByTestId('start-run-btn');

    this.header = page.getByTestId('app-header');
    this.headerYear = page.getByTestId('header-year');
    this.headerCapability = page.getByTestId('header-capability');
    this.headerScenario = page.getByTestId('header-scenario');

    this.controlsPanel = page.getByTestId('controls-panel');
    this.playPauseBtn = page.getByTestId('play-pause-btn');
    this.stepOnceBtn = page.getByTestId('step-once-btn');
    this.newRunBtn = page.getByTestId('new-run-btn');
    this.speedBtn1 = page.getByTestId('speed-btn-1');
    this.speedBtn2 = page.getByTestId('speed-btn-2');
    this.speedBtn4 = page.getByTestId('speed-btn-4');
    this.speedBtn10 = page.getByTestId('speed-btn-10');

    this.variableCards = page.getByTestId('variable-cards');
    this.graphCanvas = page.getByTestId('main-graph-canvas');

    this.resultsModal = page.getByTestId('results-modal');
    this.resultsTitle = page.getByTestId('results-title');
    this.resultsEndYear = page.getByTestId('results-end-year');
    this.keepGoingBtn = page.getByTestId('keep-going-btn');
    this.resultsNewRunBtn = page.getByTestId('results-new-run-btn');
    this.resultsCloseBtn = page.getByTestId('results-close-btn');

    this.settingsPanel = page.getByTestId('settings-panel');
    this.settingsSummary = page.getByTestId('settings-summary');
  }

  async goto() {
    await this.page.goto('/');
  }

  async startRun(preset: 'exp' | 'waves' = 'exp') {
    await expect(this.setupModal).toBeVisible();
    if (preset === 'waves') {
      await this.growthWavesOption.click();
    } else {
      await this.growthExpOption.click();
    }
    await this.startRunBtn.click();
    await expect(this.setupModal).not.toBeVisible();
  }

  getVarCard(key: string): Locator {
    return this.page.getByTestId(`var-card-${key}`);
  }

  getVarValue(key: string): Locator {
    return this.page.getByTestId(`var-value-${key}`);
  }

  async setSpeed(speed: 1 | 2 | 4 | 10) {
    await this.page.getByTestId(`speed-btn-${speed}`).click();
  }

  async waitForCrossover(timeout = 30000) {
    await expect(this.resultsModal).toBeVisible({ timeout });
    await expect(this.resultsTitle).toHaveText('Crossover reached');
  }

  async waitForFullEradication(timeout = 30000) {
    await expect(this.resultsModal).toBeVisible({ timeout });
    await expect(this.resultsTitle).toHaveText('Every disease eradicated');
  }
}
