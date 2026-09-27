import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToJSON, exportChartPNG, downloadFile } from '../utils/exportData';
import type { RunSummary, YearRecord } from '../engine';

describe('exportData utilities', () => {
  const sampleHist: YearRecord[] = [
    {
      y: 2026,
      C: 1.0,
      R: 50.0,
      LE: 73.0,
      gained: 0.0,
      dFound: 200,
      dErad: 70,
      known: 10000,
      active: 8000,
      erad: 2000,
      scares: 0,
      pands: 0,
      plateau: false,
      burst: false,
      resEvents: 0,
    },
    {
      y: 2027,
      C: 1.4,
      R: 50.5,
      LE: 73.8,
      gained: 0.8,
      dFound: 210,
      dErad: 120,
      known: 10210,
      active: 8090,
      erad: 2120,
      scares: 0,
      pands: 0,
      plateau: false,
      burst: false,
      resEvents: 0,
    },
  ];

  const sampleSummary: RunSummary = {
    outcome: 'crossover',
    endYear: 2038,
    crossYear: 2038,
    levYear: 2042,
    seed: 42,
    eradicated: 12500,
    remaining: 1500,
    healthyYears: 850000000,
    lifeExpectancy: 88.5,
    finalCapability: 1450,
    pandemics: 1,
    platforms: 2,
    safetyScares: 0,
    plateaus: 0,
  };

  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let mockDocument: {
    createElement: ReturnType<typeof vi.fn>;
    body: { appendChild: ReturnType<typeof vi.fn>; removeChild: ReturnType<typeof vi.fn> };
    querySelector: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    mockDocument = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor;
        return {};
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      querySelector: vi.fn(),
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', {
      document: mockDocument,
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
});
