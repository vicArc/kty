// Time-evolving mobjects — port of manimlib/mobject/changing.py.
// TracedPath records a moving point's trail; AnimatedBoundary cycles a glowing
// outline around a mobject. Both drive themselves via updaters (mob, dt).

import { VMobject, VGroup } from './vmobject.js';
import { WHITE } from '../foundation/constants.js';
import { smooth } from '../foundation/rate_functions.js';

const BOUNDARY_COLORS = ['#29ABCA', '#9CDCEB', '#236B8E', '#736357'];

/** Traces the path of a moving point (a function returning [x, y, z]) over time. */
export class TracedPath extends VMobject {
  constructor(
    tracedPointFunc,
    {
      timeTraced = Infinity,
      timePerAnchor = 1 / 15,
      strokeColor = WHITE,
      strokeWidth = 2,
      strokeOpacity = 1,
      ...rest
    } = {}
  ) {
    super(rest);
    this.tracedPointFunc = tracedPointFunc;
    this.timeTraced = timeTraced;
    this.timePerAnchor = timePerAnchor;
    this.strokeConfig = { color: strokeColor, width: strokeWidth, opacity: strokeOpacity };
    this.time = 0;
    this.tracedPoints = []; // own array per instance
    this.addUpdater((m, dt) => m.updatePath(dt));
  }

  updatePath(dt) {
    if (!dt) return this;
    const point = [...this.tracedPointFunc()];
    this.tracedPoints.push(point);

    let points;
    if (this.timeTraced < Infinity) {
      const nRelevant = Math.round(this.timeTraced / dt);
      const nTps = this.tracedPoints.length;
      points =
        nTps < nRelevant
          ? [...this.tracedPoints, ...Array(nRelevant - nTps).fill(point)]
          : this.tracedPoints.slice(nTps - nRelevant);
      if (nTps > 10 * nRelevant) this.tracedPoints = this.tracedPoints.slice(-nRelevant);
    } else {
      points = this.tracedPoints;
    }

    if (points.length) this.setPointsSmoothly(points);
    this.setStroke(this.strokeConfig.color, this.strokeConfig.width, this.strokeConfig.opacity);
    this.time += dt;
    return this;
  }
}

/** A short fading trail behind a mobject or point (uniform stroke; manim tapers it). */
export class TracingTail extends TracedPath {
  constructor(
    mobjectOrFunc,
    { timeTraced = 1.0, strokeColor = WHITE, strokeWidth = 3, ...rest } = {}
  ) {
    const func =
      mobjectOrFunc && typeof mobjectOrFunc.getCenter === 'function'
        ? () => mobjectOrFunc.getCenter()
        : mobjectOrFunc;
    super(func, { timeTraced, strokeColor, strokeWidth, ...rest });
    const n = Math.max(1, Math.round(this.timeTraced / this.timePerAnchor));
    const p = this.tracedPointFunc();
    this.tracedPoints = Array.from({ length: n }, () => [...p]);
  }
}

/** A glowing outline that grows and fades around a mobject, cycling colors. */
export class AnimatedBoundary extends VGroup {
  constructor(
    vmobject,
    {
      colors = BOUNDARY_COLORS,
      maxStrokeWidth = 3.0,
      cycleRate = 0.5,
      backAndForth = true,
      drawRateFunc = smooth,
      fadeRateFunc = smooth,
    } = {}
  ) {
    super(); // VGroup is variadic over mobjects; it takes no style opts
    this.vmobject = vmobject;
    this.colors = colors;
    this.maxStrokeWidth = maxStrokeWidth;
    this.cycleRate = cycleRate;
    this.backAndForth = backAndForth;
    this.drawRateFunc = drawRateFunc;
    this.fadeRateFunc = fadeRateFunc;
    this.totalTime = 0;
    this.boundaryCopies = [vmobject.copy(), vmobject.copy()];
    for (const c of this.boundaryCopies) c.setStroke(null, 0, 1).setFill(null, 0);
    this.add(...this.boundaryCopies);
    this.addUpdater((m, dt) => m.updateBoundaryCopies(dt));
  }

  updateBoundaryCopies(dt) {
    const time = this.totalTime * this.cycleRate;
    const [growing, fading] = this.boundaryCopies;
    const { colors, maxStrokeWidth: msw, vmobject } = this;

    const index = Math.floor(time % colors.length);
    const alpha = time % 1;
    const drawAlpha = this.drawRateFunc(alpha);
    const fadeAlpha = this.fadeRateFunc(alpha);

    const bounds =
      this.backAndForth && Math.floor(time) % 2 === 1 ? [1 - drawAlpha, 1] : [0, drawAlpha];
    fullFamilyBecomePartial(growing, vmobject, bounds[0], bounds[1]);
    growing.setStroke(colors[index], msw, 1);

    if (time >= 1) {
      fullFamilyBecomePartial(fading, vmobject, 0, 1);
      const prev = (index - 1 + colors.length) % colors.length;
      fading.setStroke(colors[prev], (1 - fadeAlpha) * msw, 1);
    }

    this.totalTime += dt;
    return this;
  }
}

function fullFamilyBecomePartial(mob1, mob2, a, b) {
  const f1 = mob1.familyMembersWithPoints();
  const f2 = mob2.familyMembersWithPoints();
  for (let i = 0; i < Math.min(f1.length, f2.length); i++) {
    f1[i].pointwiseBecomePartial(f2[i], a, b);
  }
}
