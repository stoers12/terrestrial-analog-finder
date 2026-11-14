export const KELVIN = 273.15;

export function mean(xs: ArrayLike<number>): number {
  if (xs.length === 0) throw new Error("mean of an empty sample");
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s / xs.length;
}

/** Mean of the lowest (or highest) `fraction` of the values. Needs at least 10 values. */
export function tailMean(xs: number[], fraction: number, tail: "low" | "high"): number {
  if (xs.length < 10) throw new Error(`tail mean needs at least 10 samples, got ${xs.length}`);
  const sorted = [...xs].sort((a, b) => a - b);
  const k = Math.max(1, Math.round(sorted.length * fraction));
  return mean(tail === "low" ? sorted.slice(0, k) : sorted.slice(sorted.length - k));
}

export const round = (n: number, d: number) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/** Physically plausible surface temperature range (K) for the Moon and Mars. */
export const T_MIN_K = 20;
export const T_MAX_K = 450;
