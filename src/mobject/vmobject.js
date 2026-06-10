// Core of manimlib/mobject/types/vectorized_mobject.py — the quadratic-bezier
// path model with separate stroke and fill style, stored in data columns.
// The full VMobject API (smoothing, subdivide, partial, joints) lands in Stage 4;
// this is the subset the renderer needs to draw shapes at parity.

import { Mobject } from './mobject.js';
import { DEFAULT_STROKE_COLOR, DEFAULT_FILL_COLOR } from '../foundation/constants.js';
import { colorToRgb, rgbToHex } from '../foundation/color.js';
import {
  midpoint,
  getNorm,
  angleOfVector,
  rotationMatrix,
  applyMatrix,
} from '../foundation/space_ops.js';
import {
  bezier,
  integerInterpolate,
  inverseInterpolate,
  partialQuadraticBezierPoints,
} from '../foundation/bezier.js';
import { listify, resizeWithInterpolation } from '../foundation/iterables.js';

const sub = (a, b) => a.map((x, i) => x - b[i]);
const polyLineLength = (pts) => {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += getNorm(sub(pts[i], pts[i - 1]));
  return s;
};

export const VMOBJECT_SCHEMA = [
  ['point', 3],
  ['stroke_rgba', 4],
  ['stroke_width', 1],
  ['fill_rgba', 4],
];

const DEFAULT_STROKE_WIDTH = 4.0;

export class VMobject extends Mobject {
  constructor({
    strokeColor = null,
    strokeWidth = null,
    strokeOpacity = null,
    fillColor = null,
    fillOpacity = null,
    color = null,
    ...rest
  } = {}) {
    super({ ...rest, schema: VMOBJECT_SCHEMA });
    // Apply user overrides on top of the defaults set during construction.
    if (color !== null) this.setColor(color);
    if (strokeColor !== null || strokeWidth !== null || strokeOpacity !== null) {
      this.setStroke(strokeColor, strokeWidth, strokeOpacity);
    }
    if (fillColor !== null || fillOpacity !== null) this.setFill(fillColor, fillOpacity);
  }

  initData(schema) {
    super.initData(schema);
    this.subpathStartIndices = [];
  }

  // VMobjects default to a visible grey stroke and an unfilled interior.
  initColors() {
    this.setStroke(DEFAULT_STROKE_COLOR, DEFAULT_STROKE_WIDTH, 1.0, false);
    this.setFill(DEFAULT_FILL_COLOR, 0.0, false);
  }

  // --- style ---
  _setRgbaColumn(name, color, opacity, recurse) {
    for (const mob of this.getFamily(recurse)) {
      if (!mob.data.columns.has(name)) continue;
      const hasPts = mob.hasPoints();
      const n = hasPts ? mob.data.length : 1;
      const rgba = hasPts ? mob.data.get(name) : mob.data.defaults.get(name);
      if (color !== null && color !== undefined) {
        let rgbs = listify(color).map(colorToRgb);
        if (rgbs.length > 1) rgbs = resizeWithInterpolation(rgbs, n);
        for (let i = 0; i < n; i++) {
          const rgb = rgbs.length === 1 ? rgbs[0] : rgbs[i];
          rgba[i * 4] = rgb[0];
          rgba[i * 4 + 1] = rgb[1];
          rgba[i * 4 + 2] = rgb[2];
        }
      }
      if (opacity !== null && opacity !== undefined) {
        for (let i = 0; i < n; i++) rgba[i * 4 + 3] = opacity;
      }
      mob.noteChangedData(false);
    }
    return this;
  }

  _setStrokeWidth(width, recurse) {
    for (const mob of this.getFamily(recurse)) {
      const hasPts = mob.hasPoints();
      const arr = hasPts ? mob.data.get('stroke_width') : mob.data.defaults.get('stroke_width');
      arr.fill(width);
    }
    return this;
  }

  setStroke(color = null, width = null, opacity = null, recurse = true) {
    if (color !== null || opacity !== null)
      this._setRgbaColumn('stroke_rgba', color, opacity, false);
    if (width !== null) this._setStrokeWidth(width, false);
    if (recurse) for (const sm of this.submobjects) sm.setStroke(color, width, opacity, true);
    return this;
  }

  setFill(color = null, opacity = null, recurse = true) {
    this._setRgbaColumn('fill_rgba', color, opacity, false);
    if (recurse) for (const sm of this.submobjects) sm.setFill(color, opacity, true);
    return this;
  }

  setColor(color, opacity = null, recurse = true) {
    this.setStroke(color, null, opacity, false);
    this.setFill(color, opacity, false);
    if (recurse) for (const sm of this.submobjects) sm.setColor(color, opacity, true);
    return this;
  }

  setOpacity(opacity, recurse = true) {
    this.setStroke(null, null, opacity, false);
    this.setFill(null, opacity, false);
    if (recurse) for (const sm of this.submobjects) sm.setOpacity(opacity, true);
    return this;
  }

  _rowOrDefault(name) {
    return this.hasPoints() ? this.data.getRow(name, 0) : this.data.defaultRow(name);
  }
  getStrokeColor() {
    return rgbToHex(this._rowOrDefault('stroke_rgba').slice(0, 3));
  }
  getStrokeOpacity() {
    return this._rowOrDefault('stroke_rgba')[3];
  }
  getStrokeWidth() {
    return this._rowOrDefault('stroke_width')[0];
  }
  getFillColor() {
    return rgbToHex(this._rowOrDefault('fill_rgba').slice(0, 3));
  }
  getFillOpacity() {
    return this._rowOrDefault('fill_rgba')[3];
  }
  getColor() {
    return this.getStrokeColor();
  }
  getOpacity() {
    return this.getStrokeOpacity();
  }

  // --- path construction (quadratic anchor/handle/anchor) ---
  _resetPath() {
    this.clearPoints();
    this.subpathStartIndices = [];
    return this;
  }

  getLastPoint() {
    const pts = this.getPoints();
    return pts[pts.length - 1];
  }

  startNewPath(point) {
    this.subpathStartIndices.push(this.getNumPoints());
    this.appendPoints([point]);
    return this;
  }

  addQuadraticBezierCurveTo(handle, anchor) {
    this.appendPoints([handle, anchor]);
    return this;
  }

  addLineTo(anchor) {
    const handle = midpoint(this.getLastPoint(), anchor);
    return this.addQuadraticBezierCurveTo(handle, anchor);
  }

  /** Approximate a cubic with two quadratics (de Casteljau midpoint split). */
  addCubicBezierCurveTo(h1, h2, anchor) {
    const a0 = this.getLastPoint();
    // Split the cubic at t=0.5 and approximate each half by one quadratic.
    const m = (p, q) => midpoint(p, q);
    const p01 = m(a0, h1);
    const p12 = m(h1, h2);
    const p23 = m(h2, anchor);
    const p012 = m(p01, p12);
    const p123 = m(p12, p23);
    const mid = m(p012, p123);
    // Quadratic handles are where the cubic's tangent lines meet (~3/2 control).
    const qh1 = p01.map((c, i) => a0[i] + 1.5 * (c - a0[i]));
    const qh2 = p23.map((c, i) => anchor[i] + 1.5 * (c - anchor[i]));
    this.addQuadraticBezierCurveTo(qh1, mid);
    this.addQuadraticBezierCurveTo(qh2, anchor);
    return this;
  }

  /** Build a polygonal path through corners (linear quadratics). */
  setPointsAsCorners(corners) {
    this._resetPath();
    if (corners.length === 0) return this;
    this.startNewPath(corners[0]);
    for (let i = 1; i < corners.length; i++) this.addLineTo(corners[i]);
    return this;
  }

  /** Append corner points (line segments) onto the current subpath. */
  addPointsAsCorners(points) {
    for (const p of points) this.addLineTo(p);
    return this;
  }

  /** Set a single subpath directly from anchor/handle/anchor points (length 2k+1). */
  setPointsAsQuads(quadPoints) {
    this._resetPath();
    this.subpathStartIndices = [0];
    this.setPoints(quadPoints);
    return this;
  }

  closePath() {
    if (this.subpathStartIndices.length === 0) return this;
    const start = this.subpathStartIndices[this.subpathStartIndices.length - 1];
    return this.addLineTo(this.getPoints()[start]);
  }

  /** Subpaths as arrays of points (each length 2k+1). */
  getSubpaths() {
    const pts = this.getPoints();
    if (pts.length === 0) return [];
    const starts = this.subpathStartIndices.length ? this.subpathStartIndices : [0];
    const subs = [];
    for (let s = 0; s < starts.length; s++) {
      const a = starts[s];
      const b = s + 1 < starts.length ? starts[s + 1] : pts.length;
      if (b - a >= 3) subs.push(pts.slice(a, b));
    }
    return subs;
  }

  /** Anchor points (every other point) across all subpaths. */
  getAnchors() {
    return this.getSubpaths().flatMap((s) => s.filter((_, i) => i % 2 === 0));
  }

  // --- curve information ---
  getNumCurves() {
    return Math.floor(this.getNumPoints() / 2);
  }

  getNthCurvePoints(n) {
    const pts = this.getPoints();
    return [pts[2 * n], pts[2 * n + 1], pts[2 * n + 2]];
  }

  getNthCurveFunction(n) {
    return bezier(this.getNthCurvePoints(n));
  }

  getBezierTuples() {
    const out = [];
    for (let n = 0; n < this.getNumCurves(); n++) out.push(this.getNthCurvePoints(n));
    return out;
  }

  getStartAnchors() {
    const pts = this.getPoints();
    const out = [];
    for (let i = 0; i < pts.length - 1; i += 2) out.push(pts[i]);
    return out;
  }

  getStartAndEnd() {
    return [this.getStart(), this.getEnd()];
  }

  /** Point a proportion alpha along the path, assuming equal-length curves. */
  quickPointFromProportion(alpha) {
    const n = this.getNumCurves();
    if (n === 0) return this.getCenter();
    const [i, residue] = integerInterpolate(0, n, alpha);
    return this.getNthCurveFunction(i)(residue);
  }

  /** Curve index + sub-proportion for an arc-length proportion alpha. */
  curveAndPropOfPartialPoint(alpha) {
    if (alpha === 0) return [0, 0];
    const partials = [0];
    for (const tup of this.getBezierTuples()) {
      const arclen = getNorm(sub(tup[1], tup[0])) < 1e-8 ? 0 : getNorm(sub(tup[2], tup[0]));
      partials.push(partials[partials.length - 1] + arclen);
    }
    const full = partials[partials.length - 1];
    if (full === 0) return [partials.length, 1];
    let index = partials.findIndex((x) => x >= full * alpha);
    if (index < 0) index = partials.length - 1;
    const residue = inverseInterpolate(partials[index - 1] / full, partials[index] / full, alpha);
    return [index - 1, residue];
  }

  pointFromProportion(alpha) {
    if (alpha <= 0) return this.getStart();
    if (alpha >= 1) return this.getEnd();
    if (this.getNumPoints() === 0) return this.getCenter();
    const [index, residue] = this.curveAndPropOfPartialPoint(alpha);
    return this.getNthCurveFunction(index)(residue);
  }

  getArcLength() {
    const pts = this.getPoints();
    const innerLen = polyLineLength(pts.filter((_, i) => i % 2 === 0));
    const outerLen = polyLineLength(pts);
    return innerLen + (outerLen - innerLen) / 3;
  }

  // --- path editing ---
  addSubpath(points) {
    if (!this.hasPoints()) {
      this.setPointsAsQuads(points);
      return this;
    }
    const last = this.getLastPoint();
    if (getNorm(sub(points[0], last)) > 1e-6) this.startNewPath(points[0]);
    this.appendPoints(points.slice(1));
    return this;
  }

  /** Append an arc of the given angle from the current end to `point` (2D). */
  addArcTo(point, angle, nComponents = null) {
    if (Math.abs(angle) < 1e-3) return this.addLineTo(point);
    const n = nComponents ?? Math.ceil((8 * Math.abs(angle)) / (2 * Math.PI));
    // Build a unit arc, then rotate/scale/translate it onto [end, point].
    const arc = quadraticBezierPointsForArcLocal(angle, n);
    const end = this.getLastPoint();
    const target = sub(point, end);
    const curr = sub(arc[arc.length - 1], arc[0]);
    const rot = rotationMatrix(angleOfVector(target) - angleOfVector(curr), [0, 0, 1]);
    const scale = getNorm(target) / getNorm(curr);
    const mapped = arc.map((p) => {
      const r = applyMatrix(rot, p).map((c) => c * scale);
      return r.map((c, i) => c + end[i] - applyMatrix(rot, arc[0])[i] * scale);
    });
    this.appendPoints(mapped.slice(1));
    return this;
  }

  putStartAndEndOn(start, end) {
    const [cs, ce] = this.getStartAndEnd();
    const currVect = sub(ce, cs);
    if (getNorm(currVect) === 0) throw new Error('Cannot position endpoints of a closed loop');
    const targetVect = sub(end, start);
    this.scale(getNorm(targetVect) / getNorm(currVect), { aboutPoint: cs });
    this.rotate(angleOfVector(targetVect) - angleOfVector(currVect));
    this.shift(sub(start, this.getStart()));
    return this;
  }

  /** Replace this path with the [a,b] portion of `vmobject` (keeps point count). */
  pointwiseBecomePartial(vmobject, a, b) {
    const vmPoints = vmobject.getPoints();
    this.subpathStartIndices = [...(vmobject.subpathStartIndices ?? [0])];
    if (a <= 0 && b >= 1) {
      this.setPoints(vmPoints);
      return this;
    }
    const numCurves = vmobject.getNumCurves();
    const newPoints = vmPoints.map((p) => [...p]);
    if (numCurves === 0) {
      this.setPoints(newPoints);
      return this;
    }
    const [lowerIndex, lowerResidue] = integerInterpolate(0, numCurves, a);
    const [upperIndex, upperResidue] = integerInterpolate(0, numCurves, b);
    const i1 = 2 * lowerIndex;
    const i4 = 2 * upperIndex + 3;
    if (lowerIndex === upperIndex) {
      const tup = partialQuadraticBezierPoints(
        vmPoints.slice(i1, i1 + 3),
        lowerResidue,
        upperResidue
      );
      for (let i = 0; i < i1; i++) newPoints[i] = [...tup[0]];
      for (let i = i1; i < i4 && i - i1 < tup.length; i++) newPoints[i] = [...tup[i - i1]];
      for (let i = i4; i < newPoints.length; i++) newPoints[i] = [...tup[2]];
    } else {
      const lowTup = partialQuadraticBezierPoints(vmPoints.slice(i1, i1 + 3), lowerResidue, 1);
      const i3 = 2 * upperIndex;
      const highTup = partialQuadraticBezierPoints(vmPoints.slice(i3, i3 + 3), 0, upperResidue);
      for (let i = 0; i < i1; i++) newPoints[i] = [...lowTup[0]];
      for (let i = 0; i < 3; i++) newPoints[i1 + i] = [...lowTup[i]];
      for (let i = 0; i < 3; i++) newPoints[i3 + i] = [...highTup[i]];
      for (let i = i4; i < newPoints.length; i++) newPoints[i] = [...highTup[2]];
    }
    this.setPoints(newPoints);
    return this;
  }
}

// Local copy to avoid a circular import with foundation/bezier arc helper.
function quadraticBezierPointsForArcLocal(angle, nComponents) {
  const nPoints = 2 * nComponents + 1;
  const points = [];
  for (let i = 0; i < nPoints; i++) {
    const a = (angle * i) / (nPoints - 1);
    points.push([Math.cos(a), Math.sin(a), 0]);
  }
  const scale = 1 / Math.cos(angle / nComponents / 2);
  for (let i = 1; i < nPoints; i += 2) points[i] = points[i].map((c) => c * scale);
  return points;
}

export class VGroup extends VMobject {
  constructor(...mobjects) {
    super();
    if (mobjects.length === 1 && Array.isArray(mobjects[0])) mobjects = mobjects[0];
    if (mobjects.length) this.add(...mobjects);
  }
}
