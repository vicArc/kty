// Port of manimlib/utils/simple_functions.py — scalar math helpers.

/** Logistic sigmoid. */
export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

const _chooseCache = new Map();
/** Binomial coefficient C(n, k), memoized (manim caches with lru_cache). */
export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  const key = n * 10000 + k;
  const hit = _chooseCache.get(key);
  if (hit !== undefined) return hit;
  let kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  result = Math.round(result);
  _chooseCache.set(key, result);
  return result;
}

/** Falling-factorial / r! variant used by manim. */
export function genChoose(n, r) {
  let prod = 1;
  for (let v = n; v > n - r; v--) prod *= v;
  let fact = 1;
  for (let i = 2; i <= r; i++) fact *= i;
  return Math.round(prod / fact);
}

/** Clamp a scalar to [minA, maxA]. */
export function clip(a, minA, maxA) {
  if (a < minA) return minA;
  if (a > maxA) return maxA;
  return a;
}

/**
 * Scalar true-divide with configurable 0/0 behavior (manim's fdiv).
 * @param {number} a
 * @param {number} b
 * @param {number|null} [zeroOverZeroValue]
 */
export function fdiv(a, b, zeroOverZeroValue = null) {
  if (zeroOverZeroValue !== null && a === 0 && b === 0) return zeroOverZeroValue;
  return a / b;
}

/**
 * Find x in [lowerBound, upperBound] with function(x) ≈ target via bisection.
 * Returns null if the target is not bracketed. Mirrors manim's binary_search.
 */
export function binarySearch(fn, target, lowerBound, upperBound, tolerance = 1e-4) {
  let lh = lowerBound;
  let rh = upperBound;
  let mh = (lh + rh) / 2;
  while (Math.abs(rh - lh) > tolerance) {
    const lx = fn(lh);
    const mx = fn(mh);
    const rx = fn(rh);
    if (lx === target) return lx;
    if (rx === target) return rx;
    if (lx <= target && rx >= target) {
      if (mx > target) rh = mh;
      else lh = mh;
    } else if (lx > target && rx < target) {
      [lh, rh] = [rh, lh];
    } else {
      return null;
    }
    mh = (lh + rh) / 2;
  }
  return mh;
}

/**
 * Deterministic short string hash for cache keys (djb2 → hex).
 * NOTE: not SHA-256; manim used sha256 for the same purpose, but only as a
 * cache key, so cross-implementation parity is not required.
 */
export function hashString(str, nChars = 16) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  let hex = (h >>> 0).toString(16);
  while (hex.length < nChars) hex = hex + (h = (h * 33) >>> 0).toString(16);
  return hex.slice(0, nChars);
}
