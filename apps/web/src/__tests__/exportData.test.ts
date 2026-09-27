import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToJSON, exportChartPNG, downloadFile } from '../utils/exportData';
import type { RunSummary, YearRecord } from '../engine';

describe('exportData utilities', () => {
  const sampleHist: YearRecord[] = [
    {
      y: 2026,
      C: 1.0,
      reg: 0.5,
      LE: 73.0,
      dLE: 0.0,
      dAg: 0.0,
      healthy: 0.0,
      rem: 8000,
      erad: 70,
      eradCum: 2000,
      newF: 200,
      T: 10.0,
      p: 0.1,
      D: 50.0,
    },
    {
      y: 2027,
      C: 1.4,
      reg: 0.505,
      LE: 73.8,
      dLE: 0.8,
      dAg: 0.0,
      healthy: 0.8,
      rem: 8090,
      erad: 120,
      eradCum: 2120,
      newF: 210,
      T: 9.5,
      p: 0.12,
      D: 55.0,
    },
  ];

  const sampleSummary: RunSummary = {
    outcome: 'crossover',
    endYear: 2038,
    crossYear: 2038,
    levYear: 2042,
    fullYear: null,
    seed: 42,
    eradicated: 12500,
    remaining: 1500,
    healthyYears: 850000000,
    lifeExpectancy: 88.5,
    finalCapability: 1450,
    pandemics: 1,
    platforms: 2,
    safetyScares: 0,
    resistanceEvents: 0,
    plateauCount: 0,
  };

  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let mockDocument: {
    documentElement: { getAttribute: ReturnType<typeof vi.fn> };
    createElement: ReturnType<typeof vi.fn>;
    body: { appendChild: ReturnType<typeof vi.fn>; removeChild: ReturnType<typeof vi.fn> };
    querySelector: ReturnType<typeof vi.fn>;
    querySelectorAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    mockDocument = {
      documentElement: {
        getAttribute: vi.fn().mockReturnValue(null),
      },
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor;
        return {};
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', {
      document: mockDocument,
      getComputedStyle: vi.fn().mockReturnValue({
        getPropertyValue: vi.fn().mockReturnValue(''),
      }),
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloadFile creates and clicks a temporary anchor tag', () => {
    downloadFile('test content', 'test.txt', 'text/plain');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(mockDocument.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('exportToCSV generates valid CSV content and triggers download', () => {
    exportToCSV(sampleHist, 42);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('tld-simulation-seed-42.csv');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('exportToJSON generates valid JSON content and triggers download', () => {
    exportToJSON(sampleSummary, sampleHist, 'Exponential AI growth');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('tld-simulation-seed-42.json');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('exportChartPNG triggers download when canvas element is present', () => {
    const mockCanvas = {
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
    } as unknown as HTMLCanvasElement;

    const result = exportChartPNG(mockCanvas);
    expect(result).toBe(true);
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(mockAnchor.download).toBe('tld-simulation-chart.png');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('exportChartPNG renders title, chart image, and legend items when 2D canvas context is supported', () => {
    const mockCtx = {
      measureText: vi.fn().mockReturnValue({ width: 80 }),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
    };

    const mockExportCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,composite-mock'),
    };

    mockDocument.createElement.mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor;
      if (tag === 'canvas') return mockExportCanvas;
      return {};
    });

    const mockSourceCanvas = {
      width: 1000,
      height: 500,
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,source-mock'),
    } as unknown as HTMLCanvasElement;

    const result = exportChartPNG({
      canvasElement: mockSourceCanvas,
      scenarioLabel: 'Exponential AI growth',
      summary: sampleSummary,
      fullHist: sampleHist,
      enabledVars: [true, true, true, true, true, false, false, false, false, false],
    });

    expect(result).toBe(true);
    expect(mockExportCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      mockSourceCanvas,
      0,
      expect.any(Number),
      1000,
      500
    );
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      expect.stringContaining('Exponential AI growth'),
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      expect.stringContaining('Life expectancy'),
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockExportCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(mockAnchor.download).toBe('tld-simulation-chart.png');
    expect(mockAnchor.click).toHaveBeenCalled();
  });
});
