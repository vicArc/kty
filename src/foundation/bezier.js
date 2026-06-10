// Port of the core of manimlib/utils/bezier.py (scalar + vector points).
// The smooth-spline solver (scipy solve_banded) is deferred until VMobject
// needs it in Stage 3/4.

import { choose } from './simple_functions.js';

const isVec = (p) => Array.isArray(p);

/**
 * Returns a function evaluating the Bézier curve through `points` at t∈[0,1].
 * Points may be scalars or equal-length numeric vectors.
 */
export function bezier(points) {
  if (points.length === 0) throw new Error('bezier cannot be called on an empty list');
  const n = points.length - 1;
  const vec = isVec(points[0]);
  return (t) => {
    if (vec) {
      const dim = points[0].length;
      const out = new Array(dim).fill(0);
      for (let k = 0; k <= n; k++) {
        const c = (1 - t) ** (n - k) * t ** k * choose(n, k);
        const p = points[k];
        for (let i = 0; i < dim; i++) out[i] += c * p[i];
      }
      return out;
    }
    let s = 0;
    for (let k = 0; k <= n; k++) {
      s += (1 - t) ** (n - k) * t ** k * choose(n, k) * points[k];
    }
    return s;
  };
}

/** Control points of the sub-curve of `points` over [a, b]. */
export function partialBezierPoints(points, a, b) {
  if (a === 1) return points.map(() => points[points.length - 1]);
  const aTo1 = points.map((_, i) => bezier(points.slice(i))(a));
  const endProp = (b - a) / (1 - a);
  return points.map((_, i) => bezier(aTo1.slice(0, i + 1))(endProp));
}

/** Fast path of partialBezierPoints for quadratics (vectors). */
export function partialQuadraticBezierPoints(points, a, b) {
  const [p0, p1, p2] = points;
  if (a === 1) return [p2, p2, p2];
  const curve = (t) =>
    p0.map((_, i) => p0[i] * (1 - t) * (1 - t) + 2 * p1[i] * t * (1 - t) + p2[i] * t * t);
  const h0 = a > 0 ? curve(a) : p0;
  const h2 = b < 1 ? curve(b) : p2;
  const h1Prime = p1.map((_, i) => (1 - a) * p1[i] + a * p2[i]);
  const endProp = (b - a) / (1 - a);
  const h1 = h0.map((_, i) => (1 - endProp) * h0[i] + endProp * h1Prime[i]);
  return [h0, h1, h2];
}

/** Linear interpolation; scalar or matching vectors, scalar alpha. */
export function interpolate(start, end, alpha) {
  if (Array.isArray(start)) {
    return start.map((s, i) => (1 - alpha) * s + alpha * end[i]);
  }
  return (1 - alpha) * start + alpha * end;
}

export function mid(start, end) {
  if (Array.isArray(start)) return start.map((s, i) => (s + end[i]) / 2);
  return (start + end) / 2;
}

export function inverseInterpolate(start, end, value) {
  if (Array.isArray(start)) return start.map((s, i) => (value[i] - s) / (end[i] - s));
  return (value - start) / (end - start);
}

export function matchInterpolate(newStart, newEnd, oldStart, oldEnd, oldValue) {
  return interpolate(newStart, newEnd, inverseInterpolate(oldStart, oldEnd, oldValue));
}

/**
 * Map alpha∈[0,1] onto an integer in [start, end) plus the residue toward the
 * next integer. e.g. integerInterpolate(0, 10, 0.46) → [4, 0.6].
 */
export function integerInterpolate(start, end, alpha) {
  if (alpha >= 1) return [end - 1, 1.0];
  if (alpha <= 0) return [start, 0];
  const value = Math.trunc(interpolate(start, end, alpha));
  const residue = ((end - start) * alpha) % 1;
  return [value, residue];
}

/** Quadratic-bezier control points approximating a circular arc of `angle`. */
export function quadraticBezierPointsForArc(angle, nComponents = 8) {
  const nPoints = 2 * nComponents + 1;
  const points = [];
  for (let i = 0; i < nPoints; i++) {
    const a = (angle * i) / (nPoints - 1);
    points.push([Math.cos(a), Math.sin(a), 0]);
  }
  const theta = angle / nComponents;
  const scale = 1 / Math.cos(theta / 2);
  for (let i = 1; i < nPoints; i += 2) {
    points[i] = points[i].map((c) => c * scale);
  }
  return points;
}
