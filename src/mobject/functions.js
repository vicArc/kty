// Port of manimlib/mobject/functions.py — parametric curves, function graphs,
// and implicit curves (marching squares). Pure VMobject geometry, no text.

import { VMobject } from './vmobject.js';
import { YELLOW, FRAME_X_RADIUS, FRAME_Y_RADIUS } from '../foundation/constants.js';

const range = (min, max, step) => {
  const out = [];
  for (let t = min; t < max - 1e-9; t += step) out.push(t);
  out.push(max);
  return out;
};

export class ParametricCurve extends VMobject {
  constructor({ tFunc, tRange = [0, 1, 0.1], ...style } = {}) {
    super(style);
    this.tFunc = tFunc;
    this.tRange = tRange;
    this._buildPoints();
  }

  _buildPoints() {
    const [tMin, tMax, step] = this.tRange;
    const points = range(tMin, tMax, step).map((t) => {
      const p = this.tFunc(t);
      return [p[0], p[1], p[2] ?? 0];
    });
    if (points.length >= 2) this.setPointsAsCorners(points);
    else if (points.length === 1) this.setPoints([points[0]]);
    return this;
  }

  getPointFromFunction(t) {
    const p = this.tFunc(t);
    return [p[0], p[1], p[2] ?? 0];
  }
}

export class FunctionGraph extends ParametricCurve {
  constructor({ func, xRange = [-8, 8, 0.25], color = YELLOW, ...style } = {}) {
    super({ tFunc: (t) => [t, func(t), 0], tRange: xRange, color, ...style });
    this.func = func;
    this.xRange = xRange;
  }
}

export class ImplicitFunction extends VMobject {
  constructor({
    func,
    xRange = [-FRAME_X_RADIUS, FRAME_X_RADIUS],
    yRange = [-FRAME_Y_RADIUS, FRAME_Y_RADIUS],
    resolution = 64,
    ...style
  } = {}) {
    super(style);
    const contours = marchingSquares(func, xRange, yRange, resolution);
    let first = true;
    for (const contour of contours) {
      if (contour.length < 2) continue;
      const pts = contour.map(([x, y]) => [x, y, 0]);
      if (first) {
        this.setPointsAsCorners(pts);
        first = false;
      } else {
        this.addSubpath(this._asQuads(pts));
      }
    }
  }

  // Convert a polyline into anchor/handle/anchor quads (midpoint handles).
  _asQuads(points) {
    const quads = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const mid = points[i - 1].map((c, j) => (c + points[i][j]) / 2);
      quads.push(mid, points[i]);
    }
    return quads;
  }
}

/**
 * Extract the f(x,y)=0 isoline over a grid via marching squares.
 * Returns a list of polylines (each an array of [x,y] points). Simple
 * fixed-resolution version (manim uses an adaptive quadtree).
 */
export function marchingSquares(func, xRange, yRange, resolution = 64) {
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;
  const nx = resolution;
  const ny = resolution;
  const dx = (x1 - x0) / nx;
  const dy = (y1 - y0) / ny;
  const X = (i) => x0 + i * dx;
  const Y = (j) => y0 + j * dy;

  // Sample the field once.
  const grid = [];
  for (let i = 0; i <= nx; i++) {
    grid[i] = [];
    for (let j = 0; j <= ny; j++) grid[i][j] = func(X(i), Y(j));
  }

  const interp = (xa, ya, va, xb, yb, vb) => {
    const t = va / (va - vb);
    return [xa + t * (xb - xa), ya + t * (yb - ya)];
  };

  // Emit one segment per crossed cell (unmerged; fine for rendering).
  const segments = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const tl = grid[i][j + 1];
      const tr = grid[i + 1][j + 1];
      const br = grid[i + 1][j];
      const bl = grid[i][j];
      let idx = 0;
      if (bl > 0) idx |= 1;
      if (br > 0) idx |= 2;
      if (tr > 0) idx |= 4;
      if (tl > 0) idx |= 8;
      if (idx === 0 || idx === 15) continue;
      const xL = X(i);
      const xR = X(i + 1);
      const yB = Y(j);
      const yT = Y(j + 1);
      const edges = {
        bottom: () => interp(xL, yB, bl, xR, yB, br),
        right: () => interp(xR, yB, br, xR, yT, tr),
        top: () => interp(xL, yT, tl, xR, yT, tr),
        left: () => interp(xL, yB, bl, xL, yT, tl),
      };
      const cases = {
        1: ['left', 'bottom'],
        2: ['bottom', 'right'],
        3: ['left', 'right'],
        4: ['right', 'top'],
        6: ['bottom', 'top'],
        7: ['left', 'top'],
        8: ['top', 'left'],
        9: ['top', 'bottom'],
        11: ['top', 'right'],
        12: ['right', 'left'],
        13: ['right', 'bottom'],
        14: ['bottom', 'left'],
        5: ['left', 'top', 'bottom', 'right'],
        10: ['left', 'bottom', 'top', 'right'],
      };
      const c = cases[idx];
      for (let k = 0; k < c.length; k += 2) {
        segments.push([edges[c[k]](), edges[c[k + 1]]()]);
      }
    }
  }
  // Each segment is its own short polyline (no stitching). Adequate for display.
  return segments;
}
