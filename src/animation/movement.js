// Movement animations — port of manimlib/animation/movement.py.
// MoveAlongPath slides a mobject along a path; the Homotopy family continuously
// deforms it by a time-varying point function.

import { Animation } from './animation.js';
import { linear } from '../foundation/rate_functions.js';

export class MoveAlongPath extends Animation {
  constructor(mobject, path, opts = {}) {
    super(mobject, opts);
    this.path = path;
  }

  interpolateMobject(alpha) {
    this.mobject.moveTo(this.path.pointFromProportion(this.rateFunc(alpha)));
  }
}

/** Continuously deform a mobject by `homotopy(x, y, z, t) -> [x', y', z']`. */
export class Homotopy extends Animation {
  constructor(homotopy, mobject, { runTime = 3.0, ...opts } = {}) {
    super(mobject, { runTime, ...opts });
    this.homotopy = homotopy;
  }

  functionAtTimeT(t) {
    return (p) => this.homotopy(p[0], p[1], p[2], t);
  }

  interpolateSubmobject(submob, start, alpha) {
    submob.matchPoints(start);
    submob.applyFunction(this.functionAtTimeT(alpha));
  }
}

/** Homotopy on complex inputs: `complexHomotopy({re, im}, t) -> {re, im}`. */
export class ComplexHomotopy extends Homotopy {
  constructor(complexHomotopy, mobject, opts = {}) {
    super(
      (x, y, z, t) => {
        const c = complexHomotopy({ re: x, im: y }, t);
        return [c.re, c.im, z];
      },
      mobject,
      opts
    );
  }
}

/** Flow a mobject's points along a vector field over `virtualTime`. */
export class PhaseFlow extends Animation {
  constructor(
    func,
    mobject,
    { virtualTime = null, runTime = 3.0, rateFunc = linear, ...opts } = {}
  ) {
    super(mobject, { runTime, rateFunc, ...opts });
    this.func = func;
    this.virtualTime = virtualTime ?? runTime;
    this.lastAlpha = null;
  }

  interpolateMobject(alpha) {
    if (this.lastAlpha !== null) {
      const dt = this.virtualTime * (alpha - this.lastAlpha);
      this.mobject.applyFunction((p) => {
        const v = this.func(p);
        return p.map((c, i) => c + dt * v[i]);
      });
    }
    this.lastAlpha = alpha;
  }
}
