// Probability mobjects — port of manimlib/mobject/probability.py.
// BarChart draws labelled bars; SampleSpace is a unit square divided into
// colored probability strips.

import { VGroup } from './vmobject.js';
import { Rectangle, Line } from './geometry.js';
import { Tex } from './svg/tex_mobject.js';
import { colorGradient } from '../foundation/color.js';
import {
  LEFT,
  RIGHT,
  DOWN,
  DL,
  BLUE,
  YELLOW,
  SMALL_BUFF,
  MED_LARGE_BUFF,
} from '../foundation/constants.js';

const neg = (v) => v.map((c) => -c);

export class BarChart extends VGroup {
  constructor({
    values,
    height = 4,
    width = 6,
    nTicks = 4,
    maxValue = 1,
    barColors = [BLUE, YELLOW],
    barFillOpacity = 0.8,
    barStrokeWidth = 3,
    barNames = [],
    yAxisLabelHeight = 0.25,
    labelYAxis = true,
    barLabelScale = 0.75,
    tickWidth = 0.2,
  } = {}) {
    super();
    this.maxValue = maxValue ?? Math.max(...values);
    this.barHeight = height;

    const xAxis = new Line({ start: [-tickWidth / 2, 0, 0], end: [width, 0, 0] });
    const yAxis = new Line({ start: [0, -MED_LARGE_BUFF, 0], end: [0, height, 0] });
    const yTicks = new VGroup();
    const yLabels = new VGroup();
    for (let k = 0; k <= nTicks; k++) {
      const y = (height * k) / nTicks;
      const value = (this.maxValue * k) / nTicks;
      const tick = new Line({ start: LEFT, end: RIGHT }).setWidth(tickWidth).moveTo([0, y, 0]);
      yTicks.add(tick);
      if (labelYAxis) {
        const label = new Tex(String(Math.round(value * 100) / 100))
          .setHeight(yAxisLabelHeight)
          .nextTo(tick, LEFT, SMALL_BUFF);
        yLabels.add(label);
      }
    }
    this.add(xAxis, yAxis, yTicks);
    if (labelYAxis) this.add(yLabels);

    const buff = width / (2 * values.length);
    const bars = new VGroup();
    values.forEach((value, i) => {
      const bar = new Rectangle({
        width: buff,
        height: (value / this.maxValue) * height,
        strokeWidth: barStrokeWidth,
        fillOpacity: barFillOpacity,
      });
      bar.moveTo([(2 * i + 0.5) * buff, 0, 0], { alignedEdge: DL });
      bars.add(bar);
    });
    bars.setColorByGradient(...barColors);
    this.add(bars);

    const barLabels = new VGroup();
    barNames.forEach((name, i) => {
      if (!bars.submobjects[i]) return;
      const label = new Tex(String(name))
        .scale(barLabelScale)
        .nextTo(bars.submobjects[i], DOWN, SMALL_BUFF);
      barLabels.add(label);
    });
    this.add(barLabels);

    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.bars = bars;
    this.barLabels = barLabels;
    this.center();
  }

  /** Restretch the bars to new values, keeping their bases on the axis. */
  changeBarValues(values) {
    this.bars.submobjects.forEach((bar, i) => {
      if (values[i] == null) return;
      const bottom = bar.getBottom();
      bar.stretchToFitHeight((values[i] / this.maxValue) * this.barHeight);
      bar.moveTo(bottom, { alignedEdge: DOWN });
    });
    return this;
  }
}

function completePList(pList) {
  const arr = [...pList];
  const remainder = 1 - arr.reduce((s, p) => s + p, 0);
  if (Math.abs(remainder) > 1e-8) arr.push(remainder);
  return arr;
}

export class SampleSpace extends Rectangle {
  constructor({
    width = 3,
    height = 3,
    fillColor = '#444444',
    fillOpacity = 1,
    strokeWidth = 0.5,
    strokeColor = '#BBBBBB',
    ...rest
  } = {}) {
    super({ width, height, fillColor, fillOpacity, strokeWidth, strokeColor, ...rest });
  }

  getDivision(pList, dim, colors, vect) {
    const ps = completePList(pList);
    const cols = colorGradient(colors, ps.length);
    const parts = new VGroup();
    let lastPoint = this.getEdgeCenter(neg(vect));
    for (let i = 0; i < ps.length; i++) {
      const part = new SampleSpace({
        width: dim === 0 ? this.getWidth() * ps[i] : this.getWidth(),
        height: dim === 1 ? this.getHeight() * ps[i] : this.getHeight(),
        fillColor: cols[i],
        fillOpacity: 1,
        strokeWidth: 0,
      });
      part.moveTo(lastPoint, { alignedEdge: neg(vect) });
      lastPoint = part.getEdgeCenter(vect);
      parts.add(part);
    }
    return parts;
  }

  getHorizontalDivision(pList, colors = ['#2A6E3F', '#236B8E'], vect = DOWN) {
    return this.getDivision(pList, 1, colors, vect);
  }

  getVerticalDivision(pList, colors = ['#A24D61', '#FFFF00'], vect = RIGHT) {
    return this.getDivision(pList, 0, colors, vect);
  }

  divideHorizontally(pList, { colors, vect } = {}) {
    this.horizontalParts = this.getHorizontalDivision(pList, colors, vect);
    this.add(this.horizontalParts);
    return this;
  }

  divideVertically(pList, { colors, vect } = {}) {
    this.verticalParts = this.getVerticalDivision(pList, colors, vect);
    this.add(this.verticalParts);
    return this;
  }
}
