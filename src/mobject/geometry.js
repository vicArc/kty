// Port of the core 2D shapes from manimlib/mobject/geometry.py, built on the
// Stage 3 VMobject. Tip/arrow handling uses the Tipable approach (a filled
// triangle submobject) rather than manim's single-polygon 3D arrow.

import { VMobject } from './vmobject.js';
import {
  ORIGIN,
  LEFT,
  RIGHT,
  TAU,
  DEGREES,
  RED,
  WHITE,
  BLACK,
  YELLOW,
} from '../foundation/constants.js';
import { quadraticBezierPointsForArc } from '../foundation/bezier.js';
import {
  rotateVector,
  getNorm,
  normalize,
  angleOfVector,
  angleBetweenVectors,
  cross2d,
} from '../foundation/space_ops.js';

const DEFAULT_DOT_RADIUS = 0.08;
const DEFAULT_SMALL_DOT_RADIUS = 0.04;

const add = (a, b) => a.map((x, i) => x + b[i]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const scaleVec = (a, s) => a.map((x) => x * s);

/** n equally spaced directions around the circle, optionally from a start vector. */
export function compassDirections(n = 4, startVect = RIGHT) {
  const dirs = [];
  for (let i = 0; i < n; i++) dirs.push(rotateVector(startVect, (TAU * i) / n));
  return dirs;
}

export class Arc extends VMobject {
  constructor({
    startAngle = 0,
    angle = TAU / 4,
    radius = 1.0,
    nComponents = null,
    arcCenter = ORIGIN,
    ...style
  } = {}) {
    super(style);
    // +1e-6 guards against JS float underflow (15*TAU/TAU = 14.999… here vs 15
    // in Python); a full circle must use an even count for a symmetric bbox.
    const n = nComponents ?? Math.floor((15 * Math.abs(angle)) / TAU + 1e-6) + 1;
    this.setPointsAsQuads(quadraticBezierPointsForArc(angle, n));
    this.rotate(startAngle, [0, 0, 1], { aboutPoint: ORIGIN });
    this.scale(radius, { aboutPoint: ORIGIN });
    this.shift(arcCenter);
  }

  getArcCenter() {
    const [a1, , a2] = this.getPoints();
    return scaleVec(add(a1, a2), 0.5); // adequate for symmetric arcs/circles
  }

  getRadius() {
    return getNorm(sub(this.getStart(), this.getCenter()));
  }
}

export class ArcBetweenPoints extends Arc {
  constructor({ start, end, angle = TAU / 4, ...style } = {}) {
    super({ angle, ...style });
    if (angle === 0) this.setPointsAsCorners([LEFT, RIGHT]);
    this.putStartAndEndOn(start, end);
  }
}

export class Circle extends Arc {
  constructor({ startAngle = 0, strokeColor = RED, ...style } = {}) {
    super({ startAngle, angle: TAU, strokeColor, ...style });
  }
  pointAtAngle(angle) {
    return this.pointFromProportion((angle % TAU) / TAU);
  }
}

export class Ellipse extends Circle {
  constructor({ width = 2.0, height = 1.0, ...style } = {}) {
    super(style);
    this.setWidth(width, { stretch: true });
    this.setHeight(height, { stretch: true });
  }
}

/** A ring segment between two radii — the wedge of an annulus. */
export class AnnularSector extends VMobject {
  constructor({
    angle = TAU / 4,
    startAngle = 0.0,
    innerRadius = 1.0,
    outerRadius = 2.0,
    arcCenter = ORIGIN,
    fillOpacity = 1.0,
    strokeWidth = 0.0,
    ...style
  } = {}) {
    super({ fillOpacity, strokeWidth, ...style });
    const outerPts = new Arc({ startAngle, angle, radius: outerRadius, arcCenter }).getPoints();
    // Build one continuous closed contour. A single subpath triangulates
    // cleanly; two disjoint subpaths would overlap and blow up the fill.
    // For inner radius ~0 use the centre as a single apex (a pie wedge) rather
    // than a reversed arc of coincident points — the latter is near-degenerate
    // and makes earcut blow up, especially for thin (few-point) sectors.
    if (innerRadius < 1e-6) {
      this.startNewPath([...arcCenter]);
    } else {
      const innerPts = [
        ...new Arc({ startAngle, angle, radius: innerRadius, arcCenter }).getPoints(),
      ].reverse();
      this.setPoints(innerPts);
    }
    this.addLineTo(outerPts[0]);
    for (let i = 0; i + 2 < outerPts.length; i += 2) {
      this.addQuadraticBezierCurveTo(outerPts[i + 1], outerPts[i + 2]);
    }
    this.addLineTo(this.getPoints()[0]); // close back to the start
  }
}

/** A filled pie wedge (an annular sector with zero inner radius). */
export class Sector extends AnnularSector {
  constructor({ angle = TAU / 4, radius = 1.0, ...style } = {}) {
    super({ angle, innerRadius: 0, outerRadius: radius, ...style });
  }
}

/** A filled ring between two radii. */
export class Annulus extends AnnularSector {
  constructor({ innerRadius = 1.0, outerRadius = 2.0, ...style } = {}) {
    super({ angle: TAU, startAngle: 0, innerRadius, outerRadius, ...style });
  }
}

export class Dot extends Circle {
  constructor({
    point = ORIGIN,
    radius = DEFAULT_DOT_RADIUS,
    strokeColor = BLACK,
    strokeWidth = 0.0,
    fillOpacity = 1.0,
    fillColor = WHITE,
    ...style
  } = {}) {
    super({ arcCenter: point, radius, strokeColor, strokeWidth, fillOpacity, fillColor, ...style });
  }
}

export class SmallDot extends Dot {
  constructor({ radius = DEFAULT_SMALL_DOT_RADIUS, ...rest } = {}) {
    super({ radius, ...rest });
  }
}

export class Line extends VMobject {
  constructor({ start = LEFT, end = RIGHT, buff = 0.0, pathArc = 0.0, ...style } = {}) {
    super(style);
    this.pathArc = pathArc;
    this.buff = buff;
    this.start = [...start];
    this.end = [...end];
    this.setPointsByEnds(this.start, this.end, buff, pathArc);
  }

  setPointsByEnds(start, end, buff = 0, pathArc = 0) {
    this.clearPoints();
    this.subpathStartIndices = [];
    this.startNewPath(start);
    this.addArcTo(end, pathArc);
    if (buff > 0) {
      const length = this.getArcLength();
      const alpha = Math.min(buff / length, 0.5);
      this.pointwiseBecomePartial(this, alpha, 1 - alpha);
    }
    return this;
  }

  getVector() {
    return sub(this.getEnd(), this.getStart());
  }
  getUnitVector() {
    return normalize(this.getVector());
  }
  getAngle() {
    return angleOfVector(this.getVector());
  }
  getLength() {
    return getNorm(this.getVector());
  }
  setLength(length, opts = {}) {
    return this.scale(length / this.getLength(), opts);
  }
}

export class DashedLine extends Line {
  constructor({ dashLength = 0.05, ...rest } = {}) {
    super(rest);
    // Render as a series of short sub-lines (stroke gaps approximated by subpaths).
    const full = this.getLength();
    const n = Math.max(1, Math.round(full / (2 * dashLength)));
    const start = this.getStart();
    const unit = this.getUnitVector();
    this.clearPoints();
    this.subpathStartIndices = [];
    for (let i = 0; i < n; i++) {
      const a = add(start, scaleVec(unit, 2 * dashLength * i));
      const b = add(a, scaleVec(unit, dashLength));
      this.addSubpath([a, midpointOf(a, b), b]);
    }
  }
}

export class Polygon extends VMobject {
  constructor({ vertices = [], ...style } = {}) {
    super(style);
    if (vertices.length) this.setPointsAsCorners([...vertices, vertices[0]]);
  }
  getVertices() {
    return this.getStartAnchors();
  }

  /** Replace sharp corners with circular arcs (manim's round_corners). */
  roundCorners(radius = null) {
    const verts = this.getVertices();
    const n = verts.length;
    if (n < 3) return this;
    if (radius === null) {
      let minEdge = Infinity;
      for (let i = 0; i < n; i++) {
        const d = getNorm(sub(verts[(i + 1) % n], verts[i]));
        if (d > 1e-6 && d < minEdge) minEdge = d;
      }
      radius = 0.25 * minEdge;
    }

    const arcs = [];
    for (let i = 0; i < n; i++) {
      const v1 = verts[(i - 1 + n) % n];
      const v2 = verts[i];
      const v3 = verts[(i + 1) % n];
      const vect1 = normalize(sub(v2, v1));
      const vect2 = normalize(sub(v3, v2));
      const angle = angleBetweenVectors(vect1, vect2);
      const cutOff = radius * Math.tan(angle / 2);
      const sign = Math.sign(radius * cross2d(vect1, vect2)) || 1;
      arcs.push(
        new ArcBetweenPoints({
          start: sub(v2, scaleVec(vect1, cutOff)),
          end: add(v2, scaleVec(vect2, cutOff)),
          angle: sign * angle,
        })
      );
    }

    this.clearPoints();
    const ordered = [arcs[n - 1], ...arcs.slice(0, -1)];
    for (let i = 0; i < ordered.length; i++) {
      const arc1 = ordered[i];
      const arc2 = ordered[(i + 1) % ordered.length];
      this.addSubpath(arc1.getPoints());
      this.addLineTo(arc2.getStart());
    }
    return this.noteChangedData();
  }
}

export class Polyline extends VMobject {
  constructor({ vertices = [], ...style } = {}) {
    super(style);
    if (vertices.length) this.setPointsAsCorners(vertices);
  }
}

export class RegularPolygon extends Polygon {
  constructor({ n = 6, radius = 1.0, startAngle = null, ...style } = {}) {
    const sa = startAngle ?? (n % 2) * 90 * DEGREES;
    const startVect = rotateVector(scaleVec(RIGHT, radius), sa);
    super({ vertices: compassDirections(n, startVect), ...style });
  }
}

export class Triangle extends RegularPolygon {
  constructor(style = {}) {
    super({ n: 3, ...style });
  }
}

export class Rectangle extends Polygon {
  constructor({ width = 4.0, height = 2.0, ...style } = {}) {
    super({
      vertices: [
        [1, 1, 0],
        [-1, 1, 0],
        [-1, -1, 0],
        [1, -1, 0],
      ],
      ...style,
    });
    this.setWidth(width, { stretch: true });
    this.setHeight(height, { stretch: true });
  }
}

export class Square extends Rectangle {
  constructor({ sideLength = 2.0, ...style } = {}) {
    super({ width: sideLength, height: sideLength, ...style });
  }
}

export class RoundedRectangle extends Rectangle {
  constructor({ width = 4.0, height = 2.0, cornerRadius = 0.5, ...style } = {}) {
    super({ width, height, ...style });
    this._cornerRadius = cornerRadius;
    // Corner rounding (round_corners) is approximated by keeping sharp corners
    // for now; full arc-based rounding lands with round_corners in a follow-up.
  }
}

/** A filled triangular arrow tip whose apex sits at the origin, pointing +x. */
export class ArrowTip extends Triangle {
  constructor({
    width = 0.35,
    length = 0.35,
    fillOpacity = 1.0,
    strokeWidth = 0.0,
    ...style
  } = {}) {
    super({ fillOpacity, strokeWidth, ...style });
    // Replace the regular triangle with an explicit apex-at-origin tip.
    this.setPointsAsCorners([
      [0, 0, 0],
      [-length, width / 2, 0],
      [-length, -width / 2, 0],
      [0, 0, 0],
    ]);
    this.tipLength = length;
  }
  getTipPoint() {
    return this.getPoints()[0];
  }
  getBase() {
    const pts = this.getPoints();
    return midpointOf(pts[2], pts[pts.length - 3]);
  }
  getTipAngle() {
    return angleOfVector(sub(this.getTipPoint(), this.getBase()));
  }
}

export class Arrow extends Line {
  constructor({ tipWidth = 0.35, tipLength = 0.35, fillColor = YELLOW, ...rest } = {}) {
    super(rest);
    this.tip = new ArrowTip({ width: tipWidth, length: tipLength, fillColor });
    this.positionTip();
    this.tip.setColor(this.getStrokeColor());
    this.add(this.tip);
  }
  positionTip() {
    const anchor = this.getEnd();
    const pts = this.getPoints();
    const handle = pts[pts.length - 2];
    this.tip.rotate(angleOfVector(sub(anchor, handle)) - this.tip.getTipAngle());
    this.tip.shift(sub(anchor, this.tip.getTipPoint()));
    return this;
  }
  getTip() {
    return this.tip;
  }
}

export class Vector extends Arrow {
  constructor({ direction = RIGHT, ...style } = {}) {
    const dir = direction.length === 2 ? [...direction, 0] : direction;
    super({ start: ORIGIN, end: dir, ...style });
  }
}

function midpointOf(a, b) {
  return a.map((x, i) => (x + b[i]) / 2);
}
