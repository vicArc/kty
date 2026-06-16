// Growing animations — port of manimlib/animation/growing.py. Each is a
// Transform whose target is the full mobject and whose *starting* state is a
// zero-scale copy placed at a point, so the mobject grows into existence.

import { Transform } from './transform.js';
import { PI } from '../foundation/constants.js';

export class GrowFromPoint extends Transform {
  constructor(mobject, point, { pointColor = null, ...opts } = {}) {
    super(mobject, null, opts);
    this.point = point;
    this.pointColor = pointColor;
  }

  createTarget() {
    return this.mobject.copy();
  }

  createStartingMobject() {
    const start = super.createStartingMobject();
    start.scale(0);
    start.moveTo(this.point);
    if (this.pointColor) start.setColor(this.pointColor);
    return start;
  }
}

export class GrowFromCenter extends GrowFromPoint {
  constructor(mobject, opts = {}) {
    super(mobject, mobject.getCenter(), opts);
  }
}

export class GrowFromEdge extends GrowFromPoint {
  constructor(mobject, edge, opts = {}) {
    super(mobject, mobject.getBoundingBoxPoint(edge), opts);
  }
}

export class GrowArrow extends GrowFromPoint {
  constructor(arrow, opts = {}) {
    super(arrow, arrow.getStart(), opts);
  }
}

/** GrowFromCenter with a half-turn spin (manim's SpinInFromNothing). */
export class SpinInFromNothing extends GrowFromCenter {
  constructor(mobject, { pathArc = PI, ...opts } = {}) {
    super(mobject, { pathArc, ...opts });
  }
}
