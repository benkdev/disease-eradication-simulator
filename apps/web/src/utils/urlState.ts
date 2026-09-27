import { DEFAULTS, type Params } from '../engine';

/**
 * Serializes simulation params into a clean URL search query string.
 * Omits parameters that match default values to keep URLs readable and concise.
 */
export function paramsToQueryString(params: Params): string {
  const searchParams = new URLSearchParams();

  for (const [key, val] of Object.entries(params) as [keyof Params, Params[keyof Params]][]) {
    if (val !== DEFAULTS[key]) {
      searchParams.set(key, String(val));
    }
  }

  return searchParams.toString();
}

/**
 * Parses URL search string into a complete Params object validated against DEFAULTS.
 */
export function paramsFromQueryString(search: string, defaults: Params = DEFAULTS): Params {
  if (!search) return { ...defaults };
  const searchParams = new URLSearchParams(search);
  const result: Params = { ...defaults };

  // Parse string and numeric fields
  for (const [key, defaultVal] of Object.entries(defaults) as [keyof Params, Params[keyof Params]][]) {
    const rawVal = searchParams.get(key);
    if (rawVal === null) continue;

    if (key === 'growth') {
      if (rawVal === 'exp' || rawVal === 'waves') {
        result.growth = rawVal;
      }
    } else if (key === 'priority') {
      if (rawVal === 'killers' || rawVal === 'rare' || rawVal === 'platforms' || rawVal === 'aging') {
        result.priority = rawVal;
      }
    } else if (typeof defaultVal === 'boolean') {
      result.endAtCross = rawVal === 'true';
    } else if (typeof defaultVal === 'number') {
      const num = Number(rawVal);
      if (!Number.isNaN(num)) {
        (result as unknown as Record<string, number>)[key] = num;
      }
    }
  }

  return result;
}

/**
 * Updates the browser address bar with current simulation params without page reload.
 */
export function syncParamsToUrl(params: Params): void {
  if (typeof window === 'undefined' || !window.history) return;
  const qs = paramsToQueryString(params);
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Copies the current shareable simulation URL to the clipboard.
 */
export async function copyShareableLink(params: Params): Promise<boolean> {
  const win = typeof window !== 'undefined' ? window : (globalThis as unknown as { window?: Window }).window;
  const nav = typeof navigator !== 'undefined' ? navigator : (globalThis as unknown as { navigator?: Navigator }).navigator;
  if (!win || !nav?.clipboard) return false;
  const qs = paramsToQueryString(params);
  const fullUrl = qs ? `${win.location.origin}${win.location.pathname}?${qs}` : win.location.origin + win.location.pathname;
  try {
    await nav.clipboard.writeText(fullUrl);
    return true;
  } catch {
    return false;
  }
}
