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

// --- Shape support functions: every shape is a radial DEFORMATION of the unit
// sphere/circle (r as a function of direction), so morphing is just blending r
// over a fixed-topology mesh — no melty vertex-correspondence, no shape-swap.
// (Adapted from davepagurek.com/blog/realtime-deformation — displace a base
// mesh, then recompute normals from the deformed surface, which kty's Surface
// does for us numerically.)
const PHI = (1 + Math.sqrt(5)) / 2;
// The 12 dodecahedron face normals (icosahedron vertex directions), unit.
const DODECA_NORMALS = (() => {
  const raw = [];
  for (const a of [1, -1])
    for (const b of [1, -1]) {
      raw.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
    }
  return raw.map((v) => {
    const n = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / n, v[1] / n, v[2] / n];
  });
})();
// 3D support radii along a unit direction (faces sit at r≈1 for all → similar size).
const R3 = [
  () => 1, // sphere
  (x, y, z) => 1 / Math.max(Math.abs(x), Math.abs(y), Math.abs(z)), // cube
  (x, y, z) => {
    let m = 1e-6;
    for (const n of DODECA_NORMALS) {
      const d = x * n[0] + y * n[1] + z * n[2];
      if (d > m) m = d;
    }
    return 1 / m; // dodecahedron (intersection of 12 half-spaces)
  },
];
// 2D support radius of a regular n-gon (apothem 1) at angle θ.
const rPoly2 = (theta, n) => {
  const seg = TAU / n;
  const a = ((theta % seg) + seg) % seg;
  return 1 / Math.cos(a - seg / 2);
};
const R2 = [
  () => 1, // circle
  (t) => rPoly2(t, 6), // hexagon
  (t) => rPoly2(t, 12), // dodecagon
];

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

// A LIVING clay ball — the dab is never static; it morphs through shapes,
// shrinking and popping back, to read as clay being smashed/kneaded. Each shape
// is a radial DEFORMATION of one base sphere/circle (fixed topology), so the
// morph is just blending the support radius across a single mesh — smooth, no
// melty vertex-correspondence and no shape-swap:
//   2D: Circle (1×) → Hexagon (½×) → Dodecagon (¼×) → Circle (1×)
//   3D: Sphere (1×) → Cube (½×) → Dodecahedron (¼×) → Sphere (1×)
// `at(timeSeconds)` returns the current mobject (centred at the origin; the
// caller positions it). One full cycle takes `cycle` seconds (default 0.8s).
export class ClaySmash {
  constructor({
    color = CLAY_COLORS.terracotta,
    baseRadius = 0.6,
    threeD = false,
    cycle = 0.8,
    sizes = [1, 0.5, 0.25],
    spin = 1.6,
    resolution = [56, 28], // 3D base-sphere grid
    samples = 72, // 2D outline points
  } = {}) {
    this.color = color;
    this.baseRadius = baseRadius;
    this.threeD = threeD;
    this.cycle = cycle;
    this.sizes = sizes;
    this.spin = spin;
    this.resolution = resolution;
    this.samples = samples;
  }

  // `vec` (optional) continuously morphs the smashing ball INTO a clay vector of
  // UNIFORM thickness — a constant-radius tube (3D) / constant-width bar (2D)
  // from the origin to the tip along `dir`, with flat ends. Built by remapping
  // the base mesh (axial position along `dir`, fixed perpendicular `thickness`),
  // lerped per-vertex with the smash shape so ball↔vector is one continuous
  // morph (no swap).
  //   vec = { morph: 0..1, dir: [x,y,z], length: worldLength, thickness? }
  at(timeSeconds, vec = null) {
    const p = ((timeSeconds % this.cycle) / this.cycle + 1) % 1;
    const seg = Math.min(2, Math.floor(p * 3));
    const fromIdx = seg;
    const toIdx = (seg + 1) % 3;
    const b = smooth01(p * 3 - seg); // eased progress within the segment
    const morph = vec ? Math.min(1, Math.max(0, vec.morph ?? 0)) : 0;
    // Smash size cycles; ease to full size as it becomes a vector.
    const sizeSmash = lerp(this.sizes[fromIdx], this.sizes[toIdx], b) * this.baseRadius;
    const size = lerp(sizeSmash, this.baseRadius, morph);
    const ax = vec && vec.dir ? normAxis(vec.dir) : [0, 0, 1];
    const vLen = vec ? (vec.length ?? 0) : 0;
    const thin = vec ? (vec.thickness ?? 0.07) : 0.07;
    // Orthonormal basis perpendicular to the vector axis (for the tube/bar).
    const up = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const e1 = normAxis(cross3(ax, up));
    const e2 = cross3(ax, e1);
    const CAP = 0.18; // v-band (radians) over which the 3D tube closes its ends

    if (this.threeD) {
      const Ra = R3[fromIdx];
      const Rb = R3[toIdx];
      const uvFunc = (u, v) => {
        const dx = Math.sin(v) * Math.cos(u);
        const dy = Math.sin(v) * Math.sin(u);
        const dz = Math.cos(v);
        const rs = lerp(Ra(dx, dy, dz), Rb(dx, dy, dz), b) * size;
        const sp = [dx * rs, dy * rs, dz * rs];
        if (morph <= 0) return sp;
        // Uniform tube: axial from v (0..length), constant radius `thin`,
        // only tapering to a closed end within the tiny CAP band at each pole.
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
      // Spin the living ball; settle (stop spinning) as it locks into a vector.
      m.rotate(timeSeconds * this.spin * (1 - morph), normAxis([0.3, 1, 0.25]));
      return m;
    }

    // 2D: uniform-width bar — axial from cos(t), constant ±thin perpendicular
    // (sign from sin(t)); flat ends. Lerped with the smash outline.
    const Ra = R2[fromIdx];
    const Rb = R2[toIdx];
    const px = -ax[1]; // perpendicular unit (in-plane)
    const py = ax[0];
    const verts = [];
    for (let i = 0; i < this.samples; i++) {
      const t = (i / this.samples) * TAU;
      const dx = Math.cos(t);
      const dy = Math.sin(t);
      const rs = lerp(Ra(t), Rb(t), b) * size;
      let x = dx * rs;
      let y = dy * rs;
      if (morph > 0) {
        const axial = ((dx + 1) / 2) * vLen;
        const side = dy >= 0 ? thin : -thin;
        const bx = ax[0] * axial + px * side;
        const by = ax[1] * axial + py * side;
        x = lerp(x, bx, morph);
        y = lerp(y, by, morph);
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
