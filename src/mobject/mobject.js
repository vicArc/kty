// Port of the renderer-agnostic core of manimlib/mobject/mobject.py.
// Geometry/style live in a MobjectData column store; the family tree, transforms,
// positioning, color, updaters, and copy semantics mirror manim 1:1.

import { MobjectData, DEFAULT_SCHEMA } from '../data/mobject_data.js';
import {
  ORIGIN,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  OUT,
  IN,
  TAU,
  FRAME_X_RADIUS,
  FRAME_Y_RADIUS,
  DEFAULT_MOBJECT_TO_EDGE_BUFF,
  DEFAULT_MOBJECT_TO_MOBJECT_BUFF,
  WHITE,
} from '../foundation/constants.js';
import { rotationMatrix, applyMatrix } from '../foundation/space_ops.js';
import { colorToRgb, rgbToHex, colorGradient } from '../foundation/color.js';
import { interpolate, integerInterpolate } from '../foundation/bezier.js';
import { listify, resizeWithInterpolation } from '../foundation/iterables.js';

const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const scaleVec = (a, s) => a.map((x) => x * s);

export class Mobject {
  dim = 3;
  pointlikeDataKeys = ['point'];

  constructor({ color = WHITE, opacity = 1.0, zIndex = 0, schema = DEFAULT_SCHEMA } = {}) {
    this.color = color;
    this.opacity = opacity;
    this.zIndex = zIndex;

    this.submobjects = [];
    this.parents = [];
    this.family = [this];
    this.boundingBox = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    this._needsNewBoundingBox = true;
    this._dataHasChanged = true;
    this._isAnimating = false;
    this.target = null;
    this.savedState = null;

    this.initData(schema);
    this.initUniforms();
    this.initUpdaters();
    // manim runs init_points before init_colors so style applies to real rows.
    this.initPoints();
    this.initColors();
  }

  // --- init hooks ---
  initData(schema) {
    this.data = new MobjectData(schema);
  }
  initUniforms() {
    this.uniforms = {};
  }
  initColors() {
    this.setColor(this.color, this.opacity);
  }
  initPoints() {
    // Subclasses populate points here.
  }

  toString() {
    return this.constructor.name;
  }

  // --- change notification ---
  noteChangedData(recurseUp = true) {
    this._dataHasChanged = true;
    if (recurseUp) for (const mob of this.parents) mob.noteChangedData();
    return this;
  }

  // --- points ---
  setPoints(points) {
    this.data.resize(points.length, 'order');
    const flat = this.data.get('point');
    for (let i = 0; i < points.length; i++) {
      flat[i * 3] = points[i][0];
      flat[i * 3 + 1] = points[i][1];
      flat[i * 3 + 2] = points[i][2];
    }
    this.refreshBoundingBox();
    return this.noteChangedData();
  }

  appendPoints(newPoints) {
    const n = this.data.length;
    const m = newPoints.length;
    this.data.resize(n + m, 'tile');
    if (n > 0) {
      for (const name of this.data.columns.keys()) {
        const row = this.data.getRow(name, n - 1);
        for (let i = n; i < n + m; i++) this.data.setRow(name, i, row);
      }
    }
    const flat = this.data.get('point');
    for (let i = 0; i < m; i++) {
      flat[(n + i) * 3] = newPoints[i][0];
      flat[(n + i) * 3 + 1] = newPoints[i][1];
      flat[(n + i) * 3 + 2] = newPoints[i][2];
    }
    this.refreshBoundingBox();
    return this.noteChangedData();
  }

  getPoints() {
    const flat = this.data.get('point');
    const out = [];
    for (let i = 0; i < this.data.length; i++) {
      out.push([flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]]);
    }
    return out;
  }

  getNumPoints() {
    return this.data.length;
  }

  hasPoints() {
    return this.data.length > 0;
  }

  clearPoints() {
    this.data.resize(0);
    return this.noteChangedData();
  }

  getAllPoints() {
    if (this.submobjects.length) return this.getFamily().flatMap((sm) => sm.getPoints());
    return this.getPoints();
  }

  applyPointsFunction(
    func,
    { aboutPoint = null, aboutEdge = ORIGIN, worksOnBoundingBox = false } = {}
  ) {
    if (aboutPoint === null && aboutEdge !== null) {
      aboutPoint = this.getBoundingBoxPoint(aboutEdge);
    }
    const apply = (p) => {
      if (aboutPoint === null) return func(p);
      return add(func(sub(p, aboutPoint)), aboutPoint);
    };
    for (const mob of this.getFamily()) {
      // Capture the current bounding box BEFORE moving points, so it is
      // transformed once (manim folds points + bbox into one pass).
      const bb = worksOnBoundingBox ? mob.getBoundingBox().map((p) => [...p]) : null;
      if (mob.hasPoints()) {
        const flat = mob.data.get('point');
        for (let i = 0; i < mob.data.length; i++) {
          const q = apply([flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]]);
          flat[i * 3] = q[0];
          flat[i * 3 + 1] = q[1];
          flat[i * 3 + 2] = q[2];
        }
      }
      if (worksOnBoundingBox) {
        mob.boundingBox = bb.map(apply);
        mob._needsNewBoundingBox = false;
      }
      mob.noteChangedData(false);
    }
    if (!worksOnBoundingBox) {
      this.refreshBoundingBox(true);
    } else {
      for (const parent of this.parents) parent.refreshBoundingBox();
    }
    return this;
  }

  // --- bounding box ---
  getBoundingBox() {
    if (this._needsNewBoundingBox) {
      this.boundingBox = this.computeBoundingBox();
      this._needsNewBoundingBox = false;
    }
    return this.boundingBox;
  }

  computeBoundingBox() {
    const pts = [];
    if (this.hasPoints()) pts.push(...this.getPoints());
    for (const mob of this.getFamily().slice(1)) {
      if (mob.hasPoints()) {
        const bb = mob.getBoundingBox();
        pts.push(bb[0], bb[2]);
      }
    }
    if (pts.length === 0)
      return [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
    const mins = [0, 1, 2].map((d) => Math.min(...pts.map((p) => p[d])));
    const maxs = [0, 1, 2].map((d) => Math.max(...pts.map((p) => p[d])));
    const mids = mins.map((m, i) => (m + maxs[i]) / 2);
    return [mins, mids, maxs];
  }

  refreshBoundingBox(recurseDown = false, recurseUp = true) {
    for (const mob of this.getFamily(recurseDown)) mob._needsNewBoundingBox = true;
    if (recurseUp) for (const parent of this.parents) parent.refreshBoundingBox();
    return this;
  }

  getBoundingBoxPoint(direction) {
    const bb = this.getBoundingBox();
    return [0, 1, 2].map((i) => bb[Math.sign(direction[i]) + 1][i]);
  }

  // --- family ---
  getFamily(recurse = true) {
    if (!recurse) return [this];
    if (this.family === null) {
      this.family = [this, ...this.submobjects.flatMap((sm) => sm.getFamily())];
    }
    return this.family;
  }

  familyMembersWithPoints() {
    return this.getFamily().filter((m) => m.hasPoints());
  }

  noteChangedFamily() {
    this.family = null;
    this.refreshHasUpdaterStatus();
    this.refreshBoundingBox();
    for (const parent of this.parents) parent.noteChangedFamily();
    return this;
  }

  add(...mobjects) {
    if (mobjects.includes(this)) throw new Error('Mobject cannot contain self');
    for (const mob of mobjects) {
      if (!this.submobjects.includes(mob)) this.submobjects.push(mob);
      if (!mob.parents.includes(this)) mob.parents.push(this);
    }
    return this.noteChangedFamily();
  }

  remove(...toRemove) {
    for (const mob of toRemove) {
      const i = this.submobjects.indexOf(mob);
      if (i >= 0) this.submobjects.splice(i, 1);
      const j = mob.parents.indexOf(this);
      if (j >= 0) mob.parents.splice(j, 1);
    }
    return this.noteChangedFamily();
  }

  clear() {
    return this.remove(...this.submobjects);
  }

  setSubmobjects(list) {
    this.clear();
    if (list.length) this.add(...list);
    return this;
  }

  getGroupClass() {
    return Group;
  }

  arrange(direction = RIGHT, buff = DEFAULT_MOBJECT_TO_MOBJECT_BUFF, { center = true } = {}) {
    for (let i = 1; i < this.submobjects.length; i++) {
      this.submobjects[i].nextTo(this.submobjects[i - 1], direction, buff);
    }
    if (center) this.center();
    return this;
  }

  // --- transforms ---
  shift(vector) {
    return this.applyPointsFunction((p) => add(p, vector), {
      aboutEdge: null,
      worksOnBoundingBox: true,
    });
  }

  scale(scaleFactor, { aboutPoint = null, aboutEdge = ORIGIN, minScaleFactor = 1e-8 } = {}) {
    const s = Math.max(scaleFactor, minScaleFactor);
    return this.applyPointsFunction((p) => scaleVec(p, s), {
      aboutPoint,
      aboutEdge,
      worksOnBoundingBox: true,
    });
  }

  stretch(factor, dim, opts = {}) {
    return this.applyPointsFunction(
      (p) => {
        const q = [...p];
        q[dim] *= factor;
        return q;
      },
      { worksOnBoundingBox: true, ...opts }
    );
  }

  rotate(angle, axis = OUT, { aboutPoint = null, aboutEdge = ORIGIN } = {}) {
    const m = rotationMatrix(angle, axis);
    return this.applyPointsFunction((p) => applyMatrix(m, p), { aboutPoint, aboutEdge });
  }

  rotateAboutOrigin(angle, axis = OUT) {
    return this.rotate(angle, axis, { aboutPoint: ORIGIN });
  }

  flip(axis = UP, opts = {}) {
    return this.rotate(TAU / 2, axis, opts);
  }

  applyMatrix(matrix, opts = {}) {
    if (opts.aboutPoint === undefined && opts.aboutEdge === undefined) opts.aboutPoint = ORIGIN;
    const full = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    for (let i = 0; i < matrix.length; i++)
      for (let j = 0; j < matrix[i].length; j++) full[i][j] = matrix[i][j];
    return this.applyPointsFunction((p) => applyMatrix(full, p), opts);
  }

  applyFunction(func, opts = {}) {
    if (Object.keys(opts).length === 0) opts.aboutPoint = ORIGIN;
    return this.applyPointsFunction((p) => func(p), opts);
  }

  applyComplexFunction(func, opts = {}) {
    return this.applyFunction((p) => {
      const w = func({ re: p[0], im: p[1] });
      return [w.re, w.im, p[2]];
    }, opts);
  }

  // --- positioning ---
  center() {
    return this.shift(scaleVec(this.getCenter(), -1));
  }

  alignOnBorder(direction, buff = DEFAULT_MOBJECT_TO_EDGE_BUFF) {
    const target = direction.map((d, i) => Math.sign(d) * [FRAME_X_RADIUS, FRAME_Y_RADIUS, 0][i]);
    const pointToAlign = this.getBoundingBoxPoint(direction);
    let shiftVal = target.map((t, i) => t - pointToAlign[i] - buff * direction[i]);
    shiftVal = shiftVal.map((s, i) => s * Math.abs(Math.sign(direction[i])));
    return this.shift(shiftVal);
  }

  toCorner(corner = add(LEFT, DOWN), buff = DEFAULT_MOBJECT_TO_EDGE_BUFF) {
    return this.alignOnBorder(corner, buff);
  }

  toEdge(edge = LEFT, buff = DEFAULT_MOBJECT_TO_EDGE_BUFF) {
    return this.alignOnBorder(edge, buff);
  }

  nextTo(
    mobjectOrPoint,
    direction = RIGHT,
    buff = DEFAULT_MOBJECT_TO_MOBJECT_BUFF,
    { alignedEdge = ORIGIN, coorMask = [1, 1, 1] } = {}
  ) {
    const targetPoint =
      mobjectOrPoint instanceof Mobject
        ? mobjectOrPoint.getBoundingBoxPoint(add(alignedEdge, direction))
        : mobjectOrPoint;
    const pointToAlign = this.getBoundingBoxPoint(sub(alignedEdge, direction));
    const shiftVal = targetPoint.map(
      (t, i) => (t - pointToAlign[i] + buff * direction[i]) * coorMask[i]
    );
    return this.shift(shiftVal);
  }

  moveTo(pointOrMobject, { alignedEdge = ORIGIN, coorMask = [1, 1, 1] } = {}) {
    const target =
      pointOrMobject instanceof Mobject
        ? pointOrMobject.getBoundingBoxPoint(alignedEdge)
        : pointOrMobject;
    const pointToAlign = this.getBoundingBoxPoint(alignedEdge);
    return this.shift(target.map((t, i) => (t - pointToAlign[i]) * coorMask[i]));
  }

  alignTo(mobjectOrPoint, direction = UP) {
    const point =
      mobjectOrPoint instanceof Mobject
        ? mobjectOrPoint.getBoundingBoxPoint(direction)
        : mobjectOrPoint;
    for (let dim = 0; dim < 3; dim++) {
      if (direction[dim] !== 0) this.setCoord(point[dim], dim, direction);
    }
    return this;
  }

  // --- size getters ---
  getEdgeCenter(direction) {
    return this.getBoundingBoxPoint(direction);
  }
  getCorner(direction) {
    return this.getBoundingBoxPoint(direction);
  }
  getCenter() {
    return this.getBoundingBox()[1];
  }
  getTop() {
    return this.getEdgeCenter(UP);
  }
  getBottom() {
    return this.getEdgeCenter(DOWN);
  }
  getRight() {
    return this.getEdgeCenter(RIGHT);
  }
  getLeft() {
    return this.getEdgeCenter(LEFT);
  }
  getZenith() {
    return this.getEdgeCenter(OUT);
  }
  getNadir() {
    return this.getEdgeCenter(IN);
  }

  lengthOverDim(dim) {
    const bb = this.getBoundingBox();
    return Math.abs(bb[2][dim] - bb[0][dim]);
  }
  getWidth() {
    return this.lengthOverDim(0);
  }
  getHeight() {
    return this.lengthOverDim(1);
  }
  getDepth() {
    return this.lengthOverDim(2);
  }

  rescaleToFit(length, dim, { stretch = false, ...opts } = {}) {
    const old = this.lengthOverDim(dim);
    if (old === 0) return this;
    if (stretch) this.stretch(length / old, dim, opts);
    else this.scale(length / old, opts);
    return this;
  }
  setWidth(width, opts = {}) {
    return this.rescaleToFit(width, 0, opts);
  }
  setHeight(height, opts = {}) {
    return this.rescaleToFit(height, 1, opts);
  }
  setDepth(depth, opts = {}) {
    return this.rescaleToFit(depth, 2, opts);
  }
  stretchToFitWidth(width, opts = {}) {
    return this.rescaleToFit(width, 0, { stretch: true, ...opts });
  }
  stretchToFitHeight(height, opts = {}) {
    return this.rescaleToFit(height, 1, { stretch: true, ...opts });
  }

  getCoord(dim, direction = ORIGIN) {
    return this.getBoundingBoxPoint(direction)[dim];
  }
  getX(direction = ORIGIN) {
    return this.getCoord(0, direction);
  }
  getY(direction = ORIGIN) {
    return this.getCoord(1, direction);
  }
  getZ(direction = ORIGIN) {
    return this.getCoord(2, direction);
  }
  setCoord(value, dim, direction = ORIGIN) {
    const curr = this.getCoord(dim, direction);
    const shiftVal = [0, 0, 0];
    shiftVal[dim] = value - curr;
    return this.shift(shiftVal);
  }
  setX(x, direction = ORIGIN) {
    return this.setCoord(x, 0, direction);
  }
  setY(y, direction = ORIGIN) {
    return this.setCoord(y, 1, direction);
  }
  setZ(z, direction = ORIGIN) {
    return this.setCoord(z, 2, direction);
  }

  getStart() {
    return [...this.getPoints()[0]];
  }
  getEnd() {
    const pts = this.getPoints();
    return [...pts[pts.length - 1]];
  }
  pointFromProportion(alpha) {
    const points = this.getPoints();
    const [i, subAlpha] = integerInterpolate(0, points.length - 1, alpha);
    return interpolate(points[i], points[i + 1], subAlpha);
  }

  // --- color / opacity ---
  setRgbaArrayByColor(color = null, opacity = null, recurse = true) {
    for (const mob of this.getFamily(recurse)) {
      const hasPts = mob.hasPoints();
      const n = hasPts ? mob.data.length : 1;
      const rgba = hasPts ? mob.data.get('rgba') : mob.data.defaults.get('rgba');
      if (color !== null) {
        const colors = listify(color);
        let rgbs = colors.map(colorToRgb);
        if (rgbs.length > 1) rgbs = resizeWithInterpolation(rgbs, n);
        for (let i = 0; i < n; i++) {
          const rgb = rgbs.length === 1 ? rgbs[0] : rgbs[i];
          rgba[i * 4] = rgb[0];
          rgba[i * 4 + 1] = rgb[1];
          rgba[i * 4 + 2] = rgb[2];
        }
      }
      if (opacity !== null) {
        let ops = typeof opacity === 'number' ? null : resizeWithInterpolation(listify(opacity), n);
        for (let i = 0; i < n; i++) rgba[i * 4 + 3] = ops ? ops[i] : opacity;
      }
      mob.noteChangedData(false);
    }
    return this;
  }

  setColor(color, opacity = null, recurse = true) {
    this.setRgbaArrayByColor(color, opacity, false);
    if (recurse) for (const sm of this.submobjects) sm.setColor(color, null, true);
    return this;
  }

  setOpacity(opacity, recurse = true) {
    this.setRgbaArrayByColor(null, opacity, false);
    if (recurse) for (const sm of this.submobjects) sm.setOpacity(opacity, true);
    return this;
  }

  getColor() {
    const rgba = this.hasPoints() ? this.data.getRow('rgba', 0) : this.data.defaultRow('rgba');
    return rgbToHex(rgba.slice(0, 3));
  }
  getOpacity() {
    const rgba = this.hasPoints() ? this.data.getRow('rgba', 0) : this.data.defaultRow('rgba');
    return rgba[3];
  }
  fade(darkness = 0.5, recurse = true) {
    return this.setOpacity(1.0 - darkness, recurse);
  }

  setColorByGradient(...colors) {
    if (this.hasPoints()) {
      this.setColor(colors);
    } else {
      const mobs = this.submobjects;
      const newColors = colorGradient(colors, mobs.length);
      mobs.forEach((mob, i) => mob.setColor(newColors[i]));
    }
    return this;
  }

  setZIndex(zIndex, recurse = true) {
    for (const mob of this.getFamily(recurse)) mob.zIndex = zIndex;
    return this;
  }

  // --- updaters ---
  initUpdaters() {
    this.updaters = [];
    this._hasUpdatersInFamily = false;
    this.updatingSuspended = false;
  }

  update(dt = 0, recurse = true) {
    if (!this.hasUpdaters() || this.updatingSuspended) return this;
    if (recurse) for (const submob of this.submobjects) submob.update(dt, recurse);
    for (const updater of this.updaters) updater(this, dt);
    return this;
  }

  getUpdaters() {
    return this.updaters;
  }

  addUpdater(updateFunc, call = true) {
    this.updaters.push(updateFunc);
    if (call) this.update(0);
    this.refreshHasUpdaterStatus();
    return this;
  }

  removeUpdater(updateFunc) {
    this.updaters = this.updaters.filter((u) => u !== updateFunc);
    this.refreshHasUpdaterStatus();
    return this;
  }

  clearUpdaters(recurse = true) {
    for (const mob of this.getFamily(recurse)) {
      mob.updaters = [];
      mob._hasUpdatersInFamily = false;
    }
    return this;
  }

  matchUpdaters(mobject) {
    this.updaters = [...mobject.updaters];
    return this.refreshHasUpdaterStatus();
  }

  suspendUpdating(recurse = true) {
    this.updatingSuspended = true;
    if (recurse) for (const submob of this.submobjects) submob.suspendUpdating(recurse);
    return this;
  }

  resumeUpdating(recurse = true, callUpdater = true) {
    this.updatingSuspended = false;
    if (recurse) for (const submob of this.submobjects) submob.resumeUpdating(recurse);
    if (callUpdater) this.update(0, recurse);
    return this;
  }

  hasUpdaters() {
    if (this._hasUpdatersInFamily === null) {
      this._hasUpdatersInFamily =
        this.updaters.length > 0 || this.submobjects.some((sm) => sm.hasUpdaters());
    }
    return this._hasUpdatersInFamily;
  }

  refreshHasUpdaterStatus() {
    this._hasUpdatersInFamily = null;
    for (const parent of this.parents) parent.refreshHasUpdaterStatus();
    return this;
  }

  isChanging() {
    return this._isAnimating || this.hasUpdaters();
  }

  setAnimatingStatus(isAnimating, recurse = true) {
    for (const mob of this.getFamily(recurse)) mob._isAnimating = isAnimating;
    return this;
  }

  // --- copy / state ---
  copy() {
    const result = Object.create(Object.getPrototypeOf(this));
    // Own enumerable scalar/array fields first (covers subclass props).
    for (const [k, v] of Object.entries(this)) result[k] = v;

    result.data = this.data.clone();
    result.uniforms = { ...this.uniforms };
    result.boundingBox = this.boundingBox.map((r) => [...r]);
    result.parents = [];
    result.target = null;
    result.savedState = null;
    result.updaters = [...this.updaters];
    result._hasUpdatersInFamily = null;
    result._dataHasChanged = true;

    result.submobjects = this.submobjects.map((sm) => sm.copy());
    for (const sm of result.submobjects) sm.parents = [result];
    result.family = null;
    return result;
  }

  become(mobject) {
    this.setSubmobjects(mobject.submobjects.map((sm) => sm.copy()));
    this.data = mobject.data.clone();
    this.uniforms = { ...mobject.uniforms };
    this.refreshBoundingBox(true);
    return this.noteChangedData();
  }

  generateTarget() {
    this.target = this.copy();
    return this.target;
  }

  saveState() {
    this.savedState = this.copy();
    return this;
  }

  restore() {
    if (!this.savedState) throw new Error('Trying to restore without having saved');
    return this.become(this.savedState);
  }

  // --- iteration ergonomics ---
  get length() {
    return this.submobjects.length;
  }
  at(i) {
    return this.submobjects[i];
  }
  *[Symbol.iterator]() {
    yield* this.submobjects;
  }
}

export class Group extends Mobject {
  constructor(...mobjects) {
    super();
    if (mobjects.length === 1 && Array.isArray(mobjects[0])) mobjects = mobjects[0];
    if (mobjects.length) this.add(...mobjects);
  }
}

export class Point extends Mobject {
  constructor({
    location = ORIGIN,
    artificialWidth = 1e-6,
    artificialHeight = 1e-6,
    ...kwargs
  } = {}) {
    super(kwargs);
    this.artificialWidth = artificialWidth;
    this.artificialHeight = artificialHeight;
    this.setLocation(location);
  }
  getWidth() {
    return this.artificialWidth;
  }
  getHeight() {
    return this.artificialHeight;
  }
  getLocation() {
    return [...this.getPoints()[0]];
  }
  getBoundingBoxPoint() {
    return this.getLocation();
  }
  setLocation(newLoc) {
    return this.setPoints([newLoc]);
  }
}
