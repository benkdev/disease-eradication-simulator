/**
 * Number formatting utilities. The engine uses these for event log messages
 * and the UI uses fmtBig for large numbers.
 */

const UNITS = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion'];

/**
 * Format large numbers for display.
 * Below 1000: rounded integer. Otherwise pick the appropriate unit
 * (thousand through quintillion). One decimal below 10 with trailing ".0" removed,
 * otherwise rounded integer. Beyond quintillion: "10^N".
 *
 * Examples: 999→"999", 1000→"1 thousand", 6400→"6.4 thousand",
 * 22000→"22 thousand", 1.5e6→"1.5 million", 1e25→"10^25"
 */
export function fmtBig(x: number): string {
  if (x < 1000) return Math.round(x).toString();

  const exp = Math.floor(Math.log10(x));
  const unitIdx = Math.floor(exp / 3);

  if (unitIdx >= UNITS.length) {
    return `10^${exp}`;
  }

  const divisor = Math.pow(10, unitIdx * 3);
  const val = x / divisor;

  if (val < 10) {
    const s = val.toFixed(1);
    return s.endsWith('.0') ? `${s.slice(0, -2)} ${UNITS[unitIdx]}` : `${s} ${UNITS[unitIdx]}`;
  } else {
    return `${Math.round(val)} ${UNITS[unitIdx]}`;
  }
}

/**
 * Format a number with commas: 17000 → "17,000"
 */
export function fmtNum(n: number): string {
  const s = Math.round(n).toString();
  let result = '';
  let count = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) result = ',' + result;
    result = s[i] + result;
    count++;
  }
  return result;
}
