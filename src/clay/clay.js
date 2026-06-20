// Clay effects (feature/clay-effects, 1.0.1) — warm matte "clay" primitives and
// build/dissolve animations for Algoramic's brand moments (loading spinner,
// welcome transfiguration, status log).
//
// A "clay ball" is a FLAT matte dab (a filled Circle), not a glossy 3D sphere:
// that matches Algoramic's flat / warm / hand-drawn language ("favour clean
// line art and the muted palette over glossy fills/gradients") and renders
// reliably in the 2D ortho scenes the articles use. The build/dissolve helpers
// are plain VMobject animations, so they compose with Scene.play.

import { Circle, Arrow, RegularPolygon } from '../mobject/geometry.js';
import { Sphere, Line3D, Cube, Dodecahedron } from '../mobject/three_dimensions.js';
import { Transform } from '../animation/transform.js';
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

// A LIVING clay ball — the dab is never static; it cycles through shapes,
// shrinking and popping back, to read as clay being smashed/kneaded.
//   2D: Circle (1×) → Hexagon (½×) → Dodecagon (¼×) → Circle (1×), a true
//       VMobject morph (Transform) per segment.
//   3D: Sphere (1×) → Cube (½×) → Dodecahedron (¼×) → Sphere (1×); 3D meshes
//       can't vertex-morph, so each beat shrinks toward a point, swaps to the
//       next solid, and grows — with a continuous spin.
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
  } = {}) {
    this.color = color;
    this.baseRadius = baseRadius;
    this.threeD = threeD;
    this.cycle = cycle;
    this.sizes = sizes;
    this.spin = spin;
  }

  _poly2d(idx, scale) {
    const r = this.baseRadius * scale;
    const m =
      idx === 0
        ? new Circle({ radius: r })
        : new RegularPolygon({ n: idx === 1 ? 6 : 12, radius: r });
    m.setFill(this.color, 1);
    m.setStroke(this.color, 0);
    return m;
  }

  _solid3d(idx) {
    let m;
    if (idx === 0) m = new Sphere({ radius: 1, resolution: [24, 12] });
    else if (idx === 1) m = new Cube({ sideLength: 1.7 });
    else m = new Dodecahedron({});
    if (m.setHeight) m.setHeight(2);
    m.setColor(this.color);
    return m;
  }

  at(timeSeconds) {
    const p = ((timeSeconds % this.cycle) / this.cycle + 1) % 1;
    const seg = Math.min(2, Math.floor(p * 3));
    const local = p * 3 - seg;
    const fromIdx = seg;
    const toIdx = (seg + 1) % 3;

    if (this.threeD) {
      const tiny = 0.05;
      let idx, s;
      if (local < 0.5) {
        idx = fromIdx;
        s = lerp(this.sizes[fromIdx], tiny, local * 2);
      } else {
        idx = toIdx;
        s = lerp(tiny, this.sizes[toIdx], (local - 0.5) * 2);
      }
      const m = this._solid3d(idx);
      m.scale(this.baseRadius * s);
      m.rotate(timeSeconds * this.spin, normAxis([0.3, 1, 0.25]));
      return m;
    }

    // 2D: true morph from one shape to the next.
    const from = this._poly2d(fromIdx, this.sizes[fromIdx]);
    const to = this._poly2d(toIdx, this.sizes[toIdx]);
    const tr = new Transform(from, to);
    tr.begin();
    tr.interpolate(smooth01(local));
    return from;
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
