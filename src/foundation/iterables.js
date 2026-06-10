// Port of manimlib/utils/iterables.py
// Items may be scalars or numeric vectors (arrays of numbers).

/** Remove duplicates while preserving order, keeping the last occurrence. */
export function removeListRedundancies(lst) {
  const seen = new Set();
  const out = [];
  for (let i = lst.length - 1; i >= 0; i--) {
    if (!seen.has(lst[i])) {
      seen.add(lst[i]);
      out.push(lst[i]);
    }
  }
  return out.reverse();
}

/** Order-preserving union; duplicates dropped from l1, not l2. */
export function listUpdate(l1, l2) {
  return removeListRedundancies([...l1, ...l2]);
}

/** Elements of l1 not present in l2. */
export function listDifferenceUpdate(l1, l2) {
  const s2 = new Set(l2);
  return [...l1].filter((e) => !s2.has(e));
}

/** Rolling n-tuples wrapping around the end. */
export function adjacentNTuples(objects, n) {
  const len = objects.length;
  const out = [];
  for (let i = 0; i < len; i++) {
    const tuple = [];
    for (let k = 0; k < n; k++) tuple.push(objects[(i + k) % len]);
    out.push(tuple);
  }
  return out;
}

/** Consecutive (wrapping) pairs. */
export function adjacentPairs(objects) {
  return adjacentNTuples(objects, 2);
}

/**
 * Split a list into [batch, prop] runs where consecutive items share
 * propertyFunc(item). Order preserved. Mirrors manim's batch_by_property.
 */
export function batchByProperty(items, propertyFunc) {
  const pairs = [];
  let currentBatch = [];
  let currentProp = null;
  let hasProp = false;
  const eq = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  for (const item of items) {
    const prop = propertyFunc(item);
    if (!hasProp || !eq(prop, currentProp)) {
      if (currentBatch.length > 0) pairs.push([currentBatch, currentProp]);
      currentProp = prop;
      hasProp = true;
      currentBatch = [item];
    } else {
      currentBatch.push(item);
    }
  }
  if (currentBatch.length > 0) pairs.push([currentBatch, currentProp]);
  return pairs;
}

/** Wrap a value in a list (strings stay whole). */
export function listify(obj) {
  if (typeof obj === 'string') return [obj];
  if (obj == null) return [obj];
  if (typeof obj[Symbol.iterator] === 'function') return [...obj];
  return [obj];
}

/** True if every element equals the first (by value). */
export function arrayIsConstant(arr) {
  if (arr.length === 0) return false;
  const first = JSON.stringify(arr[0]);
  return arr.every((x) => JSON.stringify(x) === first);
}

/** True if two arrays have the same shape and equal elements. */
export function arraysMatch(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => JSON.stringify(x) === JSON.stringify(b[i]));
}

/** Resize by tiling/truncating (numpy.resize semantics over the leading axis). */
export function resizeArray(arr, length) {
  if (arr.length === length) return arr;
  if (arr.length === 0) return [];
  return Array.from({ length }, (_, i) => arr[i % arr.length]);
}

/** Resize by sampling indices floor(i * len / length) — preserves order, repeats. */
export function resizePreservingOrder(arr, length) {
  if (arr.length === length) return arr;
  if (arr.length === 0) return Array.from({ length }, () => 0);
  return Array.from({ length }, (_, i) => arr[Math.floor((i * arr.length) / length)]);
}

/** Resize by linear interpolation between neighbors (vectors supported). */
export function resizeWithInterpolation(arr, length) {
  if (arr.length === length) return arr;
  if (arr.length === 1 || arrayIsConstant(arr)) {
    return Array.from({ length }, () => arr[0]);
  }
  if (length === 0) return [];
  const out = [];
  for (let i = 0; i < length; i++) {
    const ci = (i * (arr.length - 1)) / (length - 1);
    const lh = Math.floor(ci);
    const rh = Math.ceil(ci);
    const a = ci - lh;
    const l = arr[lh];
    const r = arr[rh];
    if (Array.isArray(l)) {
      out.push(l.map((c, j) => (1 - a) * c + a * r[j]));
    } else {
      out.push((1 - a) * l + a * r);
    }
  }
  return out;
}

/** Stretch the shorter of two sequences to match the longer (index mapping). */
export function makeEven(a, b) {
  const len1 = a.length;
  const len2 = b.length;
  if (len1 === len2) return [a, b];
  const newLen = Math.max(len1, len2);
  return [
    Array.from({ length: newLen }, (_, n) => a[Math.floor((n * len1) / newLen)]),
    Array.from({ length: newLen }, (_, n) => b[Math.floor((n * len2) / newLen)]),
  ];
}
