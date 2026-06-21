// Clay build/dissolve animations (feature/clay-effects) — first-class kty
// animations for Algoramic's brand moments.
//
// ClayIn / ClayOut wrap a render-stateless clay BUILDER (e.g. ClayVector from
// clay/clay.js) whose `frame({appear|hold|vanish|gone})` returns the mobjects
// for that instant. The animation's mobject is a Group whose children are
// rebuilt each frame from the builder, so Scene.play(new ClayIn(builder)) plays
// the whole pipeline (3 balls → pear → oval/torus → vector; or the reverse via
// splitClay). ClayPop / ClayPopOut are the squash-and-stretch "pop" of a clean
// mobject (used by the status log), built on Transform / FadeOut.

import { Animation } from './animation.js';
import { Transform } from './transform.js';
import { FadeOut } from './fading.js';
import { Group } from '../mobject/mobject.js';
import { linear, overshoot } from '../foundation/rate_functions.js';
import { clip } from '../foundation/simple_functions.js';

// Drives a stateless clay builder across a 0→1 timeline. `mode: 'in'` plays the
// builder's appear (0→1, then hold); `mode: 'out'` plays its vanish (hold→gone).
class ClayBuild extends Animation {
  constructor(builder, { mode = 'in', runTime = 1.2, ...opts } = {}) {
    // Linear time: the builder applies its own per-stage easing.
    super(new Group(), { runTime, rateFunc: linear, ...opts });
    this.builder = builder;
    this.mode = mode;
  }

  begin() {
    this.mobject.setAnimatingStatus(true);
    this.interpolate(0);
    return this;
  }

  finish() {
    this.interpolate(1);
    this.mobject.setAnimatingStatus(false);
    return this;
  }

  getRunTime() {
    return this.runTime;
  }

  getAllMobjects() {
    return [this.mobject];
  }

  _phase(alpha) {
    const a = clip(alpha, 0, 1);
    if (this.mode === 'in') return a >= 1 ? { hold: true } : { appear: a };
    if (a <= 0) return { hold: true }; // ClayOut starts from the formed mark
    return a >= 1 ? { gone: true } : { vanish: a };
  }

  interpolate(alpha) {
    this.mobject.setSubmobjects(this.builder.frame(this._phase(alpha)));
    return this;
  }
}

// Clay BUILD: the builder's object assembles from clay (e.g. 3 balls → pear →
// oval/torus → vector).
export class ClayIn extends ClayBuild {
  constructor(builder, opts = {}) {
    super(builder, { ...opts, mode: 'in' });
  }
}

// Clay DISSOLVE: the formed object tears back down (e.g. → pear → splits → gone).
export class ClayOut extends ClayBuild {
  constructor(builder, opts = {}) {
    super(builder, { ...opts, mode: 'out' });
  }
}

// A "clay pop": the mobject springs into existence from a point with a
// squash-and-stretch overshoot (it scales past full size, then settles) — the
// bouncy, sculpted feel of claymation, on CLEAN glyphs (no point morph). Built
// on Transform with an `overshoot` rate function. Reusable for any mobject.
export class ClayPop extends Transform {
  constructor(mobject, { runTime = 0.3, pull = 1.6, fromScale = 0.001, ...opts } = {}) {
    super(mobject, null, { runTime, rateFunc: (t) => overshoot(t, pull), ...opts });
    this._fromScale = fromScale;
  }

  createTarget() {
    return this.mobject.copy();
  }

  createStartingMobject() {
    const start = this.mobject.copy();
    const c = this.mobject.getCenter();
    start.scale(this._fromScale, { aboutPoint: c });
    start.moveTo(c);
    return start;
  }
}

// The reverse: the mobject shrinks and fades away (a quick clay "unpop").
export class ClayPopOut extends FadeOut {
  constructor(mobject, { runTime = 0.3, scale = 0.2, ...opts } = {}) {
    super(mobject, { runTime, scale, ...opts });
  }
}
