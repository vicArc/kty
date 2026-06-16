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

/**
 * Handles that make a sequence of anchors into an approximately-smooth quadratic
 * bezier path (manim's approx_smooth_quadratic_bezier_handles): one handle per
 * adjacent anchor pair, blending the parabola through the right neighbour with
 * the one through the left neighbour.
 */
export function approxSmoothQuadraticBezierHandles(points) {
  const n = points.length;
  if (n === 1) return [points[0].slice()];
  if (n === 2) return [points[0].map((c, d) => 0.5 * (c + points[1][d]))];

  // w0*P[i] + w1*P[i+1] + w2*P[i+2]
  const comb = (a, b, c, w0, w1, w2) => a.map((_, d) => w0 * a[d] + w1 * b[d] + w2 * c[d]);
  const close = (a, b) => a.every((c, d) => Math.abs(c - b[d]) < 1e-6);

  const str = []; // smooth_to_right
  for (let i = 0; i <= n - 3; i++)
    str.push(comb(points[i], points[i + 1], points[i + 2], 0.25, 1, -0.25));
  const rev = points.slice().reverse();
  const stl = []; // smooth_to_left (computed on the reversed anchors)
  for (let i = 0; i <= n - 3; i++) stl.push(comb(rev[i], rev[i + 1], rev[i + 2], 0.25, 1, -0.25));

  let lastStr, lastStl;
  if (close(points[0], points[n - 1])) {
    lastStr = comb(points[n - 2], points[n - 1], points[1], 0.25, 1, -0.25);
    lastStl = comb(points[1], points[0], points[n - 2], 0.25, 1, -0.25);
  } else {
    lastStr = stl[0];
    lastStl = str[0];
  }

  const top = [...str, lastStr];
  const bottom = [lastStl, ...stl.slice().reverse()];
  return top.map((t, i) => t.map((c, d) => 0.5 * (c + bottom[i][d])));
}
