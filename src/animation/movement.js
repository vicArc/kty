// Movement animations — port of manimlib/animation/movement.py (the parts that
// don't need Homotopy). MoveAlongPath slides a mobject along a path VMobject.

import { Animation } from './animation.js';

export class MoveAlongPath extends Animation {
  constructor(mobject, path, opts = {}) {
    super(mobject, opts);
    this.path = path;
  }

  interpolateMobject(alpha) {
    this.mobject.moveTo(this.path.pointFromProportion(this.rateFunc(alpha)));
  }
}
