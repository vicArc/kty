// Port of the core of manimlib/animation/creation.py.

import { Animation } from './animation.js';
import { smooth } from '../foundation/rate_functions.js';

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

// A minimal Write: draw the strokes on. DrawBorderThenFill nuance lands later.
export class Write extends ShowCreation {
  constructor(mobject, opts = {}) {
    const n = mobject.familyMembersWithPoints().length;
    super(mobject, {
      runTime: n < 15 ? 1 : 2,
      lagRatio: Math.min(4.0 / (n + 1), 0.2),
      ...opts,
    });
  }
}
