import { describe, it, expect, vi } from 'vitest';
import { DEFAULTS } from '../engine';
import {
  paramsToQueryString,
  paramsFromQueryString,
  copyShareableLink,
} from '../utils/urlState';

describe('urlState serialization & parsing', () => {
  it('omits default values from query string for clean URLs', () => {
    const qs = paramsToQueryString({ ...DEFAULTS });
    expect(qs).toBe('');
  });

  it('serializes modified parameters into query string', () => {
    const params = {
      ...DEFAULTS,
      growth: 'waves' as const,
      seed: 42,
      speed: 4,
    };
    const qs = paramsToQueryString(params);
    expect(qs).toContain('growth=waves');
    expect(qs).toContain('seed=42');
    expect(qs).not.toContain('priority=killers'); // default should be omitted
  });

  it('roundtrips custom parameters from query string', () => {
    const original = {
      ...DEFAULTS,
      growth: 'waves' as const,
      seed: 99,
      pool: 50000,
      priority: 'rare' as const,
    };
    const qs = paramsToQueryString(original);
    const parsed = paramsFromQueryString(`?${qs}`);

    expect(parsed.growth).toBe('waves');
    expect(parsed.seed).toBe(99);
    expect(parsed.pool).toBe(50000);
    expect(parsed.priority).toBe('rare');
    expect(parsed.g0).toBe(DEFAULTS.g0);
  });

  it('safely handles empty or invalid query string parameters', () => {
    const parsed = paramsFromQueryString('?growth=invalid&seed=notanumber&unknown=123');
    expect(parsed.growth).toBe(DEFAULTS.growth);
    expect(parsed.seed).toBe(DEFAULTS.seed);
  });

  it('copyShareableLink writes to navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000', pathname: '/' },
    });
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });

    const success = await copyShareableLink({ ...DEFAULTS, seed: 77 });
    expect(success).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('seed=77');

    vi.unstubAllGlobals();
  });
});
