// Numeric helpers for the SoA column store (Stage 2). Operate on flat typed
// arrays of vertices laid out as [x0,y0,z0, x1,y1,z1, ...] with a given itemSize.
// These back manim's numpy column operations without a numpy-in-JS dependency.

/** out[i] = (1-alpha)*a[i] + alpha*b[i], elementwise over a flat array. */
export function lerpInto(out, a, b, alpha) {
  for (let i = 0; i < out.length; i++) out[i] = (1 - alpha) * a[i] + alpha * b[i];
  return out;
}

/** Allocate-and-return version of lerpInto. */
export function lerp(a, b, alpha) {
  return lerpInto(new Float32Array(a.length), a, b, alpha);
}

/**
 * Resize a flat typed array of `itemSize`-tuples to `length` rows by tiling /
 * truncating (numpy.resize semantics) — manim's default resize_array.
 */
export function resizeArrayTyped(arr, length, itemSize) {
  const rows = arr.length / itemSize;
  if (rows === length) return arr;
  const out = new Float32Array(length * itemSize);
  if (rows === 0) return out;
  for (let i = 0; i < length; i++) {
    const src = (i % rows) * itemSize;
    for (let j = 0; j < itemSize; j++) out[i * itemSize + j] = arr[src + j];
  }
  return out;
}

/**
 * Resize a flat typed array of `itemSize`-tuples to `length` rows by sampling
 * indices floor(i * rows / length) — manim's resize_preserving_order.
 */
export function resizePreservingOrderTyped(arr, length, itemSize) {
  const rows = arr.length / itemSize;
  if (rows === length) return arr;
  const out = new Float32Array(length * itemSize);
  if (rows === 0) return out;
  for (let i = 0; i < length; i++) {
    const src = Math.floor((i * rows) / length) * itemSize;
    for (let j = 0; j < itemSize; j++) out[i * itemSize + j] = arr[src + j];
  }
  return out;
}

/**
 * Resize a flat typed array by linear interpolation between adjacent rows —
 * manim's resize_with_interpolation.
 */
export function resizeWithInterpolationTyped(arr, length, itemSize) {
  const rows = arr.length / itemSize;
  if (rows === length) return arr;
  const out = new Float32Array(length * itemSize);
  if (rows === 0) return out;
  if (rows === 1) {
    for (let i = 0; i < length; i++) out.set(arr, i * itemSize);
    return out;
  }
  for (let i = 0; i < length; i++) {
    const ci = (i * (rows - 1)) / (length - 1);
    const lh = Math.floor(ci);
    const rh = Math.ceil(ci);
    const a = ci - lh;
    for (let j = 0; j < itemSize; j++) {
      out[i * itemSize + j] = (1 - a) * arr[lh * itemSize + j] + a * arr[rh * itemSize + j];
    }
  }
  return out;
}
