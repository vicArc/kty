// Core of manimlib/mobject/types/vectorized_mobject.py — the quadratic-bezier
// path model with separate stroke and fill style, stored in data columns.
// The full VMobject API (smoothing, subdivide, partial, joints) lands in Stage 4;
// this is the subset the renderer needs to draw shapes at parity.

import { Mobject } from './mobject.js';
import { DEFAULT_STROKE_COLOR, DEFAULT_FILL_COLOR } from '../foundation/constants.js';
import { colorToRgb, rgbToHex } from '../foundation/color.js';
import { midpoint } from '../foundation/space_ops.js';
import { listify, resizeWithInterpolation } from '../foundation/iterables.js';

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
    return this.getSubpaths().flatMap((sub) => sub.filter((_, i) => i % 2 === 0));
  }
}

export class VGroup extends VMobject {
  constructor(...mobjects) {
    super();
    if (mobjects.length === 1 && Array.isArray(mobjects[0])) mobjects = mobjects[0];
    if (mobjects.length) this.add(...mobjects);
  }
}
