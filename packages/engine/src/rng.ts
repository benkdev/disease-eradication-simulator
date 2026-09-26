/**
 * Seeded random number generator using mulberry32 and Box-Muller for gaussians.
 * All randomness in the simulation flows through this — no Math.random allowed.
 */

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  private rnd: () => number;

  constructor(seed: number) {
    this.rnd = mulberry32(seed);
  }

  /** Uniform draw in [0, 1). */
  uniform(): number {
    return this.rnd();
  }

  /** Standard normal draw via Box-Muller. Re-draws zeros. */
  gauss(): number {
    let u: number;
    let v: number;
    do {
      u = this.rnd();
    } while (u === 0);
    do {
      v = this.rnd();
    } while (v === 0);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
