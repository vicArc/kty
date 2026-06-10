// Port of the core of manimlib/mobject/coordinate_systems.py + number_line.py.
// Geometry only — numeric tick labels (DecimalNumber/Tex) arrive with Stage 7.

import { VGroup } from './vmobject.js';
import { Line } from './geometry.js';
import { ParametricCurve } from './functions.js';
import { ORIGIN, PI, COLORS } from '../foundation/constants.js';

const fullRange = (r) => (r.length === 2 ? [r[0], r[1], 1] : r);

export class NumberLine extends Line {
  constructor({
    xRange = [-8, 8, 1],
    color = COLORS.GREY_B,
    strokeWidth = 2.0,
    unitSize = 1.0,
    width = null,
    includeTicks = true,
    tickSize = 0.1,
    ...style
  } = {}) {
    const [xMin, xMax, xStep] = fullRange(xRange);
    super({ start: [xMin, 0, 0], end: [xMax, 0, 0], color, strokeWidth, ...style });
    this.xMin = xMin;
    this.xMax = xMax;
    this.xStep = xStep;
    this.xRange = [xMin, xMax, xStep];
    this.tickSize = tickSize;

    if (width) this.setWidth(width);
    else this.scale(unitSize);
    this.center();

    if (includeTicks) this.addTicks();
  }

  numberToPoint(number) {
    const start = this.getStart();
    const end = this.getEnd();
    const alpha = (number - this.xMin) / (this.xMax - this.xMin);
    return start.map((s, i) => (1 - alpha) * s + alpha * end[i]);
  }
  n2p(number) {
    return this.numberToPoint(number);
  }

  pointToNumber(point) {
    const start = this.getStart();
    const end = this.getEnd();
    const vect = end.map((e, i) => e - start[i]);
    let num = 0;
    let den = 0;
    for (let i = 0; i < 3; i++) {
      num += (point[i] - start[i]) * vect[i];
      den += vect[i] * vect[i];
    }
    const proportion = den === 0 ? 0 : num / den;
    return this.xMin + (this.xMax - this.xMin) * proportion;
  }
  p2n(point) {
    return this.pointToNumber(point);
  }

  getUnitSize() {
    return this.getLength() / (this.xMax - this.xMin);
  }

  getTickRange() {
    const out = [];
    for (let x = this.xMin; x <= this.xMax + 1e-9; x += this.xStep) out.push(x);
    return out;
  }

  getTick(x, size = this.tickSize) {
    const tick = new Line({ start: [0, -size, 0], end: [0, size, 0] });
    tick.rotate(this.getAngle());
    tick.moveTo(this.numberToPoint(x));
    tick.setStroke(this.getStrokeColor(), this.getStrokeWidth());
    return tick;
  }

  addTicks() {
    const ticks = new VGroup();
    for (const x of this.getTickRange()) ticks.add(this.getTick(x));
    this.add(ticks);
    this.ticks = ticks;
    return this;
  }
}

export class Axes extends VGroup {
  constructor({
    xRange = [-8, 8, 1],
    yRange = [-8, 8, 1],
    axisConfig = {},
    unitSize = 1.0,
    width = null,
    height = null,
  } = {}) {
    super();
    this.xRange = fullRange(xRange);
    this.yRange = fullRange(yRange);
    this.xAxis = this.createAxis(this.xRange, { unitSize, width, ...axisConfig });
    this.yAxis = this.createAxis(this.yRange, { unitSize, width: height, ...axisConfig });
    this.yAxis.rotate(PI / 2, [0, 0, 1], { aboutPoint: ORIGIN });
    this.axes = new VGroup(this.xAxis, this.yAxis);
    this.add(this.xAxis, this.yAxis);
    this.center();
  }

  createAxis(rangeTerms, config) {
    const axis = new NumberLine({ xRange: rangeTerms, ...config });
    axis.shift(axis.n2p(0).map((c) => -c));
    return axis;
  }

  getAxes() {
    return [this.xAxis, this.yAxis];
  }

  getOrigin() {
    return this.coordsToPoint(0, 0);
  }

  coordsToPoint(...coords) {
    const origin = this.xAxis.numberToPoint(0);
    let pt = [...origin];
    this.getAxes().forEach((axis, i) => {
      if (coords[i] !== undefined) {
        const ap = axis.numberToPoint(coords[i]);
        pt = pt.map((c, j) => c + (ap[j] - origin[j]));
      }
    });
    return pt;
  }
  c2p(...coords) {
    return this.coordsToPoint(...coords);
  }

  pointToCoords(point) {
    return this.getAxes().map((axis) => axis.pointToNumber(point));
  }
  p2c(point) {
    return this.pointToCoords(point);
  }

  /** A graph of y = func(x) plotted in this coordinate system. */
  getGraph(func, { xRange = null, ...style } = {}) {
    const baseStep = this.xRange[2] || 1;
    const xr = xRange ?? [this.xRange[0], this.xRange[1], baseStep / 8];
    const graph = new ParametricCurve({
      tFunc: (t) => this.c2p(t, func(t)),
      tRange: xr,
      ...style,
    });
    graph.func = func;
    return graph;
  }
}

export class NumberPlane extends Axes {
  constructor({ backgroundLineColor = COLORS.BLUE_D, ...opts } = {}) {
    super(opts);
    this.addBackgroundLines(backgroundLineColor);
  }

  addBackgroundLines(color) {
    const grid = new VGroup();
    const [x0, x1, xs] = this.xRange;
    const [y0, y1, ys] = this.yRange;
    const lineStyle = { strokeColor: color, strokeWidth: 1, strokeOpacity: 0.5 };
    for (let x = x0; x <= x1 + 1e-9; x += xs) {
      grid.add(new Line({ start: this.c2p(x, y0), end: this.c2p(x, y1), ...lineStyle }));
    }
    for (let y = y0; y <= y1 + 1e-9; y += ys) {
      grid.add(new Line({ start: this.c2p(x0, y), end: this.c2p(x1, y), ...lineStyle }));
    }
    this.add(grid);
    grid.setZIndex(-1);
    this.backgroundLines = grid;
    return this;
  }
}
