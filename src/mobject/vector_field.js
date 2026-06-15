// Vector fields (Stage 6.6) — adapted from vector_field.py. manim's VectorField
// packs every arrow into one VMobject with per-vertex stroke width (a custom
// shader); kty has no per-vertex stroke width, so we use the web-native,
// visually-equivalent approach: a VGroup of Arrow mobjects (manim's older
// ArrowVectorField). StreamLines integrates the field with RK4.

import { VGroup, VMobject } from './vmobject.js';
import { Arrow } from './geometry.js';
import { getNorm } from '../foundation/space_ops.js';
import { colorGradient } from '../foundation/color.js';

const sub = (a, b) => a.map((x, i) => x - b[i]);

// A coolwarm-ish magnitude ramp (low → high).
export const FIELD_COLORS = ['#3b4cc0', '#7b9ff9', '#c2c2c2', '#f6a385', '#b40426'];

function sampleGrid(cs, density) {
  const [x0, x1, xs] = cs.xRange;
  const [y0, y1, ys] = cs.yRange;
  const stepX = xs / density;
  const stepY = ys / density;
  const coords = [];
  for (let x = x0; x <= x1 + 1e-9; x += stepX) {
    for (let y = y0; y <= y1 + 1e-9; y += stepY) coords.push([x, y]);
  }
  return { coords, stepX, stepY };
}

export class VectorField extends VGroup {
  constructor({
    func, // (x, y) => [dx, dy] in coordinate space
    coordinateSystem,
    density = 1.0,
    color = null, // fixed color (else colored by magnitude)
    colors = FIELD_COLORS,
    strokeWidth = 4,
    maxVectorLength = null,
    ...style
  } = {}) {
    super();
    this.func = func;
    this.coordinateSystem = coordinateSystem;
    const cs = coordinateSystem;
    const origin = cs.getOrigin();
    const { coords, stepX } = sampleGrid(cs, density);

    const samples = [];
    let maxMag = 1e-12;
    for (const [x, y] of coords) {
      const out = func(x, y);
      const mag = Math.hypot(out[0], out[1]);
      if (mag > maxMag) maxMag = mag;
      samples.push([x, y, out[0], out[1], mag]);
    }

    const [x0, y0] = [cs.xRange[0], cs.yRange[0]];
    const stepScreen = getNorm(sub(cs.c2p(x0 + stepX, y0), cs.c2p(x0, y0))) || 0.5;
    const maxLen = maxVectorLength != null ? maxVectorLength : 0.85 * stepScreen;
    const grad = color ? null : colorGradient(colors, 64);

    for (const [x, y, ux, uy, mag] of samples) {
      const outScreen = sub(cs.c2p(ux, uy), origin);
      const norm = getNorm(outScreen);
      if (norm < 1e-8) continue;
      const drawn = maxLen * Math.tanh(norm / maxLen);
      const base = cs.c2p(x, y);
      const tip = base.map((c, i) => c + (drawn / norm) * outScreen[i]);
      const col = color || grad[Math.min(63, Math.floor((mag / maxMag) * 63))];
      const tl = Math.min(0.3, drawn * 0.5);
      this.add(
        new Arrow({
          start: base,
          end: tip,
          buff: 0,
          strokeColor: col,
          strokeWidth,
          fillColor: col,
          tipLength: tl,
          tipWidth: tl,
          ...style,
        })
      );
    }
  }
}

/** One RK4 step of dp/dt = func(p) in coordinate space. */
function rk4Step(func, p, dt) {
  const k1 = func(p[0], p[1]);
  const k2 = func(p[0] + 0.5 * dt * k1[0], p[1] + 0.5 * dt * k1[1]);
  const k3 = func(p[0] + 0.5 * dt * k2[0], p[1] + 0.5 * dt * k2[1]);
  const k4 = func(p[0] + dt * k3[0], p[1] + dt * k3[1]);
  return [
    p[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    p[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
}

export class StreamLines extends VGroup {
  constructor({
    func,
    coordinateSystem,
    density = 1.0,
    nSteps = 60,
    dt = 0.05,
    strokeWidth = 2,
    strokeOpacity = 1.0,
    color = null,
    colors = FIELD_COLORS,
    ...style
  } = {}) {
    super();
    this.func = func;
    this.coordinateSystem = coordinateSystem;
    const cs = coordinateSystem;
    const [x0, x1] = cs.xRange;
    const [y0, y1] = cs.yRange;
    const { coords } = sampleGrid(cs, density);

    // Magnitude range across seeds for coloring.
    let maxMag = 1e-12;
    for (const [x, y] of coords) {
      const out = func(x, y);
      maxMag = Math.max(maxMag, Math.hypot(out[0], out[1]));
    }
    const grad = color ? null : colorGradient(colors, 64);

    for (const seed of coords) {
      let p = [seed[0], seed[1]];
      const pts = [];
      for (let i = 0; i < nSteps; i++) {
        pts.push(cs.c2p(p[0], p[1]));
        p = rk4Step(func, p, dt);
        if (p[0] < x0 - 1 || p[0] > x1 + 1 || p[1] < y0 - 1 || p[1] > y1 + 1) break;
      }
      if (pts.length < 2) continue;
      const out = func(seed[0], seed[1]);
      const mag = Math.hypot(out[0], out[1]);
      const col = color || grad[Math.min(63, Math.floor((mag / maxMag) * 63))];
      this.add(
        new VMobject(style).setPointsAsCorners(pts).setStroke(col, strokeWidth, strokeOpacity)
      );
    }
  }
}
