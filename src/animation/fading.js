// Port of the core of manimlib/animation/fading.py, built on Transform.

import { Transform } from './transform.js';
import { ORIGIN } from '../foundation/constants.js';

export class FadeIn extends Transform {
  constructor(mobject, { shift = ORIGIN, scale = 1.0, ...opts } = {}) {
    // Target is a full copy so interpolation reads from an independent buffer.
    super(mobject, mobject.copy(), opts);
    this._shift = shift;
    this._scale = scale;
  }
  createStartingMobject() {
    const start = this.mobject.copy();
    start.setOpacity(0);
    if (this._scale !== 1) start.scale(this._scale); // scale<1 grows in; 0 = from a point
    start.shift(this._shift.map((c) => -c));
    return start;
  }
}

export class FadeOut extends Transform {
  constructor(mobject, { shift = ORIGIN, scale = 1.0, ...opts } = {}) {
    const target = mobject.copy().setOpacity(0);
    if (scale !== 1) target.scale(scale);
    target.shift(shift);
    super(mobject, target, { remover: true, ...opts });
  }
}

export class FadeInFromPoint extends FadeIn {
  constructor(mobject, point, opts = {}) {
    super(mobject, { shift: mobject.getCenter().map((c, i) => point[i] - c), scale: 0, ...opts });
  }
}

export class FadeOutToPoint extends FadeOut {
  constructor(mobject, point, opts = {}) {
    super(mobject, { shift: point.map((c, i) => c - mobject.getCenter()[i]), scale: 0, ...opts });
  }
}
