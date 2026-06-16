// Port of the core of manimlib/animation/creation.py.

import { Animation } from './animation.js';
import { smooth, doubleSmooth } from '../foundation/rate_functions.js';
import { integerInterpolate } from '../foundation/bezier.js';

/** Reveals a portion [getBounds(alpha)] of each submobject. */
export class ShowPartial extends Animation {
  interpolateSubmobject(submob, startSubmob, alpha) {
    const [a, b] = this.getBounds(alpha);
    submob.pointwiseBecomePartial(startSubmob, a, b);
  }
  getBounds() {
    throw new Error('ShowPartial.getBounds not implemented');
  }
}

export class ShowCreation extends ShowPartial {
  constructor(mobject, opts = {}) {
    super(mobject, { lagRatio: 1.0, ...opts });
  }
  getBounds(alpha) {
    return [0, alpha];
  }
}

export class Uncreate extends ShowCreation {
  constructor(mobject, opts = {}) {
    super(mobject, {
      rateFunc: (t) => smooth(1 - t),
      remover: true,
      finalAlphaValue: 0,
      ...opts,
    });
  }
}

// Alias matching the ManimCommunity-style name many authors expect.
export class Create extends ShowCreation {}

/**
 * Draw a VMobject's border on, then fill it in — manim's DrawBorderThenFill.
 * Phase 0 (alpha 0→0.5) reveals a stroke-only outline progressively; phase 1
 * (0.5→1) morphs that outline into the final filled mobject.
 */
export class DrawBorderThenFill extends Animation {
  constructor(
    vmobject,
    { runTime = 2, rateFunc = doubleSmooth, strokeWidth = 2, strokeColor = null, ...opts } = {}
  ) {
    super(vmobject, { runTime, rateFunc, ...opts });
    this.drawStrokeWidth = strokeWidth;
    this.drawStrokeColor = strokeColor;
  }

  begin() {
    this.outline = this.getOutline();
    this._smToIndex = new Map();
    super.begin();
    // Make the live mobject look like the (fill-less) outline before drawing.
    this.mobject.matchStyle(this.outline);
    return this;
  }

  getOutline() {
    const outline = this.mobject.copy();
    outline.setFill(null, 0);
    for (const sm of outline.familyMembersWithPoints()) {
      if (sm.setStroke) {
        sm.setStroke(this.drawStrokeColor ?? sm.getStrokeColor(), this.drawStrokeWidth, 1);
      }
    }
    return outline;
  }

  getAllMobjects() {
    return [...super.getAllMobjects(), this.outline];
  }

  interpolateSubmobject(submob, start, outline, alpha) {
    const [index, subAlpha] = integerInterpolate(0, 2, alpha);
    if (index === 1 && (this._smToIndex.get(submob) ?? 0) === 0) {
      submob.data = outline.data.clone();
      submob.noteChangedData();
      this._smToIndex.set(submob, 1);
    }
    if (index === 0) {
      submob.pointwiseBecomePartial(outline, 0, subAlpha);
    } else {
      submob.interpolate(outline, start, subAlpha);
    }
  }
}

/** Write a VMobject: draw the border, then fill, staggered across submobjects. */
export class Write extends DrawBorderThenFill {
  constructor(mobject, opts = {}) {
    const n = mobject.familyMembersWithPoints().length;
    super(mobject, {
      runTime: n < 15 ? 1 : 2,
      lagRatio: Math.min(4.0 / (n + 1), 0.2),
      ...opts,
    });
  }
}
