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

/**
 * Natural cubic-spline handle points through a sequence of anchors (open curve),
 * solved with the Thomas tridiagonal algorithm per dimension. Returns
 * [firstHandles, secondHandles], one cubic handle pair per segment. Used by
 * VMobject's 'true_smooth' anchor mode.
 */
export function getSmoothCubicBezierHandlePoints(points) {
  const n = points.length - 1; // number of segments
  const dim = points[0].length;
  if (n < 1) return [[], []];
  if (n === 1) {
    const h1 = points[0].map((c, d) => c + (points[1][d] - c) / 3);
    const h2 = points[0].map((c, d) => c + (2 * (points[1][d] - c)) / 3);
    return [[h1], [h2]];
  }
  const P1 = Array.from({ length: n }, () => new Array(dim).fill(0));
  const P2 = Array.from({ length: n }, () => new Array(dim).fill(0));
  for (let d = 0; d < dim; d++) {
    const K = points.map((p) => p[d]);
    const a = new Array(n);
    const b = new Array(n);
    const c = new Array(n);
    const r = new Array(n);
    a[0] = 0;
    b[0] = 2;
    c[0] = 1;
    r[0] = K[0] + 2 * K[1];
    for (let i = 1; i < n - 1; i++) {
      a[i] = 1;
      b[i] = 4;
      c[i] = 1;
      r[i] = 4 * K[i] + 2 * K[i + 1];
    }
    a[n - 1] = 2;
    b[n - 1] = 7;
    c[n - 1] = 0;
    r[n - 1] = 8 * K[n - 1] + K[n];
    for (let i = 1; i < n; i++) {
      const m = a[i] / b[i - 1];
      b[i] -= m * c[i - 1];
      r[i] -= m * r[i - 1];
    }
    const x = new Array(n);
    x[n - 1] = r[n - 1] / b[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = (r[i] - c[i] * x[i + 1]) / b[i];
    for (let i = 0; i < n; i++) P1[i][d] = x[i];
    for (let i = 0; i < n - 1; i++) P2[i][d] = 2 * K[i + 1] - x[i + 1];
    P2[n - 1][d] = (K[n] + x[n - 1]) / 2;
  }
  return [P1, P2];
}
