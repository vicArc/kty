// Port of manimlib/animation/rotation.py.

import { Animation } from './animation.js';
import { OUT, ORIGIN, PI, TAU } from '../foundation/constants.js';
import { linear, smooth } from '../foundation/rate_functions.js';

export class Rotating extends Animation {
  constructor(
    mobject,
    {
      angle = TAU,
      axis = OUT,
      aboutPoint = null,
      aboutEdge = null,
      runTime = 5,
      rateFunc = linear,
      ...opts
    } = {}
  ) {
    super(mobject, { runTime, rateFunc, ...opts });
    this.angle = angle;
    this.axis = axis;
    this.aboutPoint = aboutPoint;
    this.aboutEdge = aboutEdge;
  }

  interpolateMobject(alpha) {
    // Reset point data from the starting state, then rotate by rate(alpha)*angle.
    for (const [sm, start] of this.families) {
      if (sm.hasPoints()) sm.data.get('point').set(start.data.get('point'));
    }
    this.mobject.refreshBoundingBox(true);
    this.mobject.rotate(this.rateFunc(alpha) * this.angle, this.axis, {
      aboutPoint: this.aboutPoint,
      aboutEdge: this.aboutEdge ?? ORIGIN,
    });
  }
}

export class Rotate extends Rotating {
  constructor(
    mobject,
    angle = PI,
    { axis = OUT, aboutEdge = ORIGIN, runTime = 1, rateFunc = smooth, ...opts } = {}
  ) {
    super(mobject, { angle, axis, aboutEdge, runTime, rateFunc, ...opts });
  }
}
