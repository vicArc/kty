// Clay effects (feature/clay-effects, 1.0.1) — warm matte "clay" primitives and
// build/dissolve animations for Algoramic's brand moments (loading spinner,
// welcome transfiguration, status log).
//
// A "clay ball" is a FLAT matte dab (a filled Circle), not a glossy 3D sphere:
// that matches Algoramic's flat / warm / hand-drawn language ("favour clean
// line art and the muted palette over glossy fills/gradients") and renders
// reliably in the 2D ortho scenes the articles use. The build/dissolve helpers
// are plain VMobject animations, so they compose with Scene.play.

import { Circle, Arrow, Polygon } from '../mobject/geometry.js';
import { Sphere, Line3D } from '../mobject/three_dimensions.js';
import { Surface } from '../mobject/surface.js';
import { TAU, PI } from '../foundation/constants.js';
import { LaggedStart } from '../animation/composition.js';
import { GrowFromCenter } from '../animation/growing.js';
import { FadeOut } from '../animation/fading.js';

export const CLAY_COLORS = {
  terracotta: '#b06a3c',
  ochre: '#9a7d3a',
  cream: '#f3ecdf',
};

const to3 = (p) => (p.length === 2 ? [p[0], p[1], 0] : p);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpPt = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);
const dist3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const smooth01 = (t) => t * t * (3 - 2 * t);
const normAxis = (v) => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};
const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// --- Shape morph steps. Every shape is a (u,v)→point map of ONE base grid
// (sphere in 3D / circle in 2D), so morphing between consecutive shapes is a
// per-vertex blend over a fixed-topology mesh — smooth, no shape-swap. Even a
// torus works: the sphere grid wraps into it (the hole opens up continuously).
// (Adapted from davepagurek.com/blog/realtime-deformation — displace a base
// mesh; kty's Surface re-derives normals from the deformed grid.)
const PHI = (1 + Math.sqrt(5)) / 2;
const normMany = (raw) =>
  raw.map((v) => {
    const n = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / n, v[1] / n, v[2] / n];
  });
// Dodecahedron's 12 face normals = icosahedron vertices: (0,±1,±φ) + cyclic.
const DODECA_FACE_NORMALS = normMany(
  (() => {
    const r = [];
    for (const a of [1, -1])
      for (const b of [1, -1]) r.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
    return r;
  })()
);
// Icosahedron's 20 face normals = dodecahedron vertices: cube (±1,±1,±1) + cyclic.
const ICOSA_FACE_NORMALS = normMany(
  (() => {
    const r = [];
    for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) r.push([x, y, z]);
    const a = 1 / PHI;
    for (const s1 of [1, -1])
      for (const s2 of [1, -1])
        r.push([0, s1 * a, s2 * PHI], [s1 * a, s2 * PHI, 0], [s2 * PHI, 0, s1 * a]);
    return r;
  })()
);
// Support radius (faces at r≈1) for a polytope given its face normals.
const supportR = (x, y, z, normals) => {
  let m = 1e-6;
  for (const n of normals) {
    const d = x * n[0] + y * n[1] + z * n[2];
    if (d > m) m = d;
  }
  return 1 / m;
};

// Base sphere direction and helpers.
const sphereDir = (u, v) => {
  const sv = Math.sin(v);
  return [sv * Math.cos(u), sv * Math.sin(u), Math.cos(v)];
};
const radial3 = (u, v, R) => {
  const d = sphereDir(u, v);
  const r = R(d[0], d[1], d[2]);
  return [d[0] * r, d[1] * r, d[2] * r];
};
const torusPt = (u, v) => {
  const tv = 2 * v; // sphere v∈[0,π] → tube angle [0,2π]
  const R = 0.62;
  const r = 0.34;
  const ct = Math.cos(tv);
  return [(R + r * ct) * Math.cos(u), (R + r * ct) * Math.sin(u), r * Math.sin(tv)];
};
// 3D step sequence: sphere → icosahedron → dodecahedron → torus.
const SHAPES_3D = [
  (u, v) => sphereDir(u, v),
  (u, v) => radial3(u, v, (x, y, z) => supportR(x, y, z, ICOSA_FACE_NORMALS)),
  (u, v) => radial3(u, v, (x, y, z) => supportR(x, y, z, DODECA_FACE_NORMALS)),
  (u, v) => torusPt(u, v),
];

// Base shape maps, exported so callers can compose custom morph sequences
// (e.g. circle→pear→oval / sphere→pear→torus) via ClaySmash's `shapes` option.
export const clayCircle2D = (t) => [Math.cos(t), Math.sin(t)];
export const claySphere3D = (u, v) => sphereDir(u, v);
export const clayTorus3D = (u, v) => torusPt(u, v);
export const clayOval2D = (t) => {
  const a = 1.3;
  const b = 0.78;
  const r = 1 / Math.hypot(Math.cos(t) / a, Math.sin(t) / b);
  return [Math.cos(t) * r, Math.sin(t) * r];
};

// 2D: angular support radius of a regular n-gon (apothem 1).
const rPoly2 = (theta, n) => {
  const seg = TAU / n;
  const a = ((theta % seg) + seg) % seg;
  return 1 / Math.cos(a - seg / 2);
};
const polyPt = (t, n) => {
  const r = rPoly2(t, n);
  return [Math.cos(t) * r, Math.sin(t) * r];
};
// 2D step sequence: circle → hexagon → dodecagon → "dona" (holeless oval ring).
const SHAPES_2D = [
  (t) => [Math.cos(t), Math.sin(t)],
  (t) => polyPt(t, 6),
  (t) => polyPt(t, 12),
  (t) => {
    const a = 1.3;
    const b = 0.78;
    const r = 1 / Math.hypot(Math.cos(t) / a, Math.sin(t) / b);
    return [Math.cos(t) * r, Math.sin(t) * r];
  },
];

// --- Mathematical pear: superellipse top (centred (0,1)) ∪ circle bottom
// (centred (0,-1), r²=2). 3D = revolve the profile about y (x² → x²+z²).
// Precompute the radial boundary r(θ) from the origin = max(circle exit,
// superellipse exit), then normalise to a centred ~unit shape.
const PEAR_N1 = 2; // squareness of the top (2 = smooth shoulders)
const PEAR_SAMPLES = 721;
const pearRadialTable = (() => {
  const tbl = new Float64Array(PEAR_SAMPLES);
  // Circle x²+(y+1)²=2, ray from origin: t² + 2·sinθ·t − 1 = 0.
  const circleT = (s) => -s + Math.sqrt(s * s + 1);
  // Superellipse x^(2n)+(y−1)^(2n)=1; f(t) crosses 0 at the far exit (upward rays).
  const sef = (t, c, s) =>
    Math.pow(Math.abs(t * c), 2 * PEAR_N1) + Math.pow(Math.abs(t * s - 1), 2 * PEAR_N1) - 1;
  for (let i = 0; i < PEAR_SAMPLES; i++) {
    const th = (i / (PEAR_SAMPLES - 1)) * TAU;
    const c = Math.cos(th);
    const s = Math.sin(th);
    let tse = 0;
    if (s > 1e-6) {
      let prev = sef(1e-3, c, s);
      for (let t = 0.04; t <= 2.6; t += 0.02) {
        const f = sef(t, c, s);
        if (prev < 0 && f >= 0) {
          let lo = t - 0.02;
          let hi = t;
          for (let k = 0; k < 26; k++) {
            const mid = (lo + hi) / 2;
            if (sef(mid, c, s) < 0) lo = mid;
            else hi = mid;
          }
          tse = (lo + hi) / 2;
          break;
        }
        prev = f;
      }
    }
    tbl[i] = Math.max(circleT(s), tse);
  }
  return tbl;
})();
const pearRadius = (theta) => {
  const a = ((theta % TAU) + TAU) % TAU;
  const x = (a / TAU) * (PEAR_SAMPLES - 1);
  const i = Math.floor(x);
  const f = x - i;
  return pearRadialTable[i] * (1 - f) + pearRadialTable[Math.min(PEAR_SAMPLES - 1, i + 1)] * f;
};
// Normalisation: centre vertically and scale to half-height 1.
const PEAR_NORM = (() => {
  let ymin = Infinity;
  let ymax = -Infinity;
  for (let i = 0; i < PEAR_SAMPLES; i++) {
    const th = (i / (PEAR_SAMPLES - 1)) * TAU;
    const y = pearRadialTable[i] * Math.sin(th);
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  const cy = (ymin + ymax) / 2;
  return { cy, scale: 2 / (ymax - ymin) };
})();
// Pear outline point (2D) at angle θ — centred, ~unit, upright (stem up).
export const clayPear2D = (theta) => {
  const r = pearRadius(theta);
  return [
    r * Math.cos(theta) * PEAR_NORM.scale,
    (r * Math.sin(theta) - PEAR_NORM.cy) * PEAR_NORM.scale,
  ];
};
// Pear surface (3D): revolve the right-half profile about the y-axis.
export const clayPear3D = (u, v) => {
  const thP = Math.PI / 2 - v; // v:0→π maps profile top→bottom
  const r = pearRadius(thP);
  const R = r * Math.cos(thP) * PEAR_NORM.scale;
  const Y = (r * Math.sin(thP) - PEAR_NORM.cy) * PEAR_NORM.scale;
  return [R * Math.cos(u), Y, R * Math.sin(u)];
};

// A flat, matte clay dab: a small filled circle in a warm earthy tone.
// `setColor` recolours it (e.g. per theme); `setOpacity` fades it.
export class ClayBall extends Circle {
  constructor(opts = {}) {
    const { radius = 0.12, color = CLAY_COLORS.terracotta, opacity = 1, ...rest } = opts;
    super({ radius, ...rest });
    this.setFill(color, opacity);
    this.setStroke(color, 0);
  }
}

// A 3D clay ball: a matte sphere (the 3D counterpart of ClayBall). `color` is
// any colour; used as the clay "dot" that stretches into a 3D vector.
export class ClayBall3D extends Sphere {
  constructor(opts = {}) {
    const { radius = 0.18, color = CLAY_COLORS.terracotta, resolution = [24, 12], ...rest } = opts;
    super({ radius, resolution, ...rest });
    this.setColor(color);
  }
}

// Modeling-clay vector: a ball of clay at `from` is pulled into a vector toward
// `to`, the blob shrinking as the vector completes. Works in 2D (flat Arrow +
// ClayBall) and 3D (Line3D + ClayBall3D). Any colour; any direction (when
// from === to it's just a shrinking blob — use ClayIn for in-place objects).
//
// `at(alpha)` returns the mobjects for formation progress alpha∈[0,1]; the
// caller drives it forward to form, holds, and reverses it to collapse (see the
// /loading-scene playground). Kept render-stateless (fresh mobjects per call)
// so it composes with per-frame renderers like the article scenes.
export class ClayStretch {
  constructor({
    from = [0, 0, 0],
    to = [3, 3, 0],
    color = CLAY_COLORS.terracotta,
    threeD = false,
    strokeWidth = 10,
    tubeWidth = 0.14,
    ballRadius = 0.3,
  } = {}) {
    this.from = to3(from);
    this.to = to3(to);
    this.color = color;
    this.threeD = threeD;
    this.strokeWidth = strokeWidth;
    this.tubeWidth = tubeWidth;
    this.ballRadius = ballRadius;
  }

  at(alpha) {
    const a = Math.min(1, Math.max(0, alpha));
    const tip = lerpPt(this.from, this.to, a);
    const grown = dist3(this.from, tip) > 1e-3;
    const objs = [];
    if (this.threeD) {
      if (grown) {
        const line = new Line3D({
          start: this.from,
          end: tip,
          width: this.tubeWidth,
        });
        line.setColor(this.color);
        objs.push(line);
      }
      const r = Math.max(0.01, this.ballRadius * (1 - a) + this.tubeWidth * 0.7);
      const ball = new ClayBall3D({ radius: r, color: this.color });
      ball.moveTo(tip);
      objs.push(ball);
    } else {
      if (grown) {
        const arr = new Arrow({
          start: this.from,
          end: tip,
          strokeColor: this.color,
          strokeWidth: this.strokeWidth,
          fillColor: this.color,
          tipWidth: 0.32,
          tipLength: 0.32,
        });
        objs.push(arr);
      }
      const r = Math.max(0.01, this.ballRadius * (1 - a) + 0.06);
      const ball = new ClayBall({ radius: r, color: this.color });
      ball.moveTo(tip);
      objs.push(ball);
    }
    return objs;
  }
}

// A LIVING clay ball that morphs through a SHAPE SEQUENCE (one base mesh, fixed
// topology, smooth per-vertex blends) to read as clay being kneaded:
//   2D: circle → hexagon → dodecagon → "dona" (oval ring)
//   3D: sphere → icosahedron → dodecahedron → torus
// Driven either by `progress` (0..1 across the sequence, exactly once — for the
// vector/icon "appear") or by `time` (free cycling through every shape — for the
// standalone ball demo). `vec` continuously morphs the current shape INTO a
// uniform-thickness clay vector (tube/bar) toward `dir`. `at(...)` returns the
// mobject centred at the origin; the caller positions/rotates it.
export class ClaySmash {
  constructor({
    color = CLAY_COLORS.terracotta,
    baseRadius = 0.6,
    threeD = false,
    cycle = 0.8,
    resolution = [56, 28], // 3D base-sphere grid
    samples = 72, // 2D outline points
    shapes = null, // override the morph sequence (array of (u,v)/(t) fns)
  } = {}) {
    this.color = color;
    this.baseRadius = baseRadius;
    this.threeD = threeD;
    this.cycle = cycle;
    this.resolution = resolution;
    this.samples = samples;
    this.shapes = shapes || (threeD ? SHAPES_3D : SHAPES_2D);
  }

  // Resolve the active shape pair + blend from `progress` (0..1, once) or
  // `time` (cycling). Returns [shapeA, shapeB, blend].
  _segment({ progress, time }) {
    const n = this.shapes.length;
    if (progress != null) {
      const x = Math.min(1, Math.max(0, progress)) * (n - 1);
      const from = Math.min(n - 2, Math.floor(x));
      return [this.shapes[from], this.shapes[from + 1], smooth01(x - from)];
    }
    const p = ((time % this.cycle) / this.cycle + 1) % 1;
    const seg = Math.floor(p * n) % n;
    return [this.shapes[seg], this.shapes[(seg + 1) % n], smooth01(p * n - Math.floor(p * n))];
  }

  //   opts = { time?, progress?, spin?, vec? }
  //   vec  = { morph: 0..1, dir: [x,y,z], length: worldLength, thickness? }
  at(opts = {}) {
    const { time = 0, progress = null, spin = 0, vec = null } = opts;
    const [fA, fB, b] = this._segment({ progress, time });
    const size = this.baseRadius;
    const morph = vec ? Math.min(1, Math.max(0, vec.morph ?? 0)) : 0;
    const ax = vec && vec.dir ? normAxis(vec.dir) : [0, 0, 1];
    const vLen = vec ? (vec.length ?? 0) : 0;
    const thin = vec ? (vec.thickness ?? 0.07) : 0.07;
    const up = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const e1 = normAxis(cross3(ax, up));
    const e2 = cross3(ax, e1);
    const CAP = 0.18;

    if (this.threeD) {
      const uvFunc = (u, v) => {
        const a = fA(u, v);
        const c = fB(u, v);
        const sp = [
          lerp(a[0], c[0], b) * size,
          lerp(a[1], c[1], b) * size,
          lerp(a[2], c[2], b) * size,
        ];
        if (morph <= 0) return sp;
        // Uniform tube toward `ax`: axial from v, constant radius `thin`.
        const axial = (v / PI) * vLen;
        const rad = thin * Math.min(1, Math.min(v, PI - v) / CAP);
        const cu = Math.cos(u) * rad;
        const su = Math.sin(u) * rad;
        const tp = [
          ax[0] * axial + e1[0] * cu + e2[0] * su,
          ax[1] * axial + e1[1] * cu + e2[1] * su,
          ax[2] * axial + e1[2] * cu + e2[2] * su,
        ];
        return [lerp(sp[0], tp[0], morph), lerp(sp[1], tp[1], morph), lerp(sp[2], tp[2], morph)];
      };
      const m = new Surface({
        uvFunc,
        uRange: [0, TAU],
        vRange: [0, PI],
        resolution: this.resolution,
      });
      m.setColor(this.color);
      if (spin) m.rotate(spin, normAxis([0.3, 1, 0.25]));
      return m;
    }

    // 2D outline.
    const px = -ax[1];
    const py = ax[0];
    const verts = [];
    for (let i = 0; i < this.samples; i++) {
      const t = (i / this.samples) * TAU;
      const a = fA(t);
      const c = fB(t);
      let x = lerp(a[0], c[0], b) * size;
      let y = lerp(a[1], c[1], b) * size;
      if (morph > 0) {
        const axial = ((Math.cos(t) + 1) / 2) * vLen;
        const side = Math.sin(t) >= 0 ? thin : -thin;
        x = lerp(x, ax[0] * axial + px * side, morph);
        y = lerp(y, ax[1] * axial + py * side, morph);
      }
      verts.push([x, y, 0]);
    }
    const poly = new Polygon({ vertices: verts });
    poly.setFill(this.color, 1);
    poly.setStroke(this.color, 0);
    return poly;
  }
}

// Stagger-grow a set of clay balls into existence (a clay take on ShowCreation).
export function clayShow(balls, { lagRatio = 0.05 } = {}) {
  return new LaggedStart(
    balls.map((b) => new GrowFromCenter(b)),
    { lagRatio }
  );
}

// Fade/sink a set of clay balls away (dissolve to clay and disappear).
export function clayDissolve(balls, { lagRatio = 0.03, shift = [0, -0.5, 0] } = {}) {
  return new LaggedStart(
    balls.map((b) => new FadeOut(b, { shift })),
    { lagRatio }
  );
}
