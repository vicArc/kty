// Port of manimlib/animation/update.py.

import { Animation } from './animation.js';
import { linear } from '../foundation/rate_functions.js';

export class UpdateFromFunc extends Animation {
  constructor(mobject, updateFunction, opts = {}) {
    super(mobject, { suspendMobjectUpdating: false, ...opts });
    this.updateFunction = updateFunction;
  }
  interpolateMobject() {
    this.updateFunction(this.mobject);
  }
}

export class UpdateFromAlphaFunc extends UpdateFromFunc {
  interpolateMobject(alpha) {
    this.updateFunction(this.mobject, this.rateFunc(alpha));
  }
}

export class MaintainPositionRelativeTo extends Animation {
  constructor(mobject, trackedMobject, opts = {}) {
    super(mobject, { rateFunc: linear, ...opts });
    this.trackedMobject = trackedMobject;
    this.diff = mobject.getCenter().map((c, i) => c - trackedMobject.getCenter()[i]);
  }
  interpolateMobject() {
    const target = this.trackedMobject.getCenter().map((c, i) => c + this.diff[i]);
    this.mobject.moveTo(target);
  }
}
