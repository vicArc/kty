// Claymation morph (feature/clay-effects) — a first-class kty animation.
//
// The brand effect: a ball of clay is CREATED, KNEADED (spun), then RESHAPED
// into the target mobject ('in'); or the reverse — the target collapses into a
// ball, is kneaded, and DISAPPEARS ('out'). It combines ShowCreation, Rotate,
// Transform and FadeOut (kty.victorarce.com/#showcreation + #transform-anim).
//
// Why not a plain Succession: AnimationGroup.begin() begins every child up
// front, but Transform.begin() aligns the subject's point data to its target
// immediately — which would corrupt the earlier ShowCreation/Rotate phases that
// run on the *ball*. ClayMorph instead begins each phase lazily, only when its
// slice of the timeline is reached, so every phase runs on the correct state.

import { Animation } from './animation.js';
import { ShowCreation } from './creation.js';
import { Rotate } from './rotation.js';
import { Transform } from './transform.js';
import { FadeOut } from './fading.js';
import { ClayBall, CLAY_COLORS } from '../clay/clay.js';
import { PI } from '../foundation/constants.js';
import { linear } from '../foundation/rate_functions.js';
import { clip } from '../foundation/simple_functions.js';

export class ClayMorph extends Animation {
  constructor(
    target,
    {
      mode = 'in',
      // Clay ball appearance.
      color = CLAY_COLORS.terracotta,
      ballRadius = null, // null => derived from the target's height
      ballCenter = null, // null => the target's center; [x,y,z] to override
      spin = PI, // knead rotation (radians)
      // Timing: total run time in seconds (default 0.3s smooth transition).
      runTime = 0.3,
      // Phase boundaries within [0,1]: [create|knead, knead|reshape].
      splits = [0.34, 0.66],
      ...opts
    } = {}
  ) {
    const h = target.getHeight ? target.getHeight() : 0.8;
    const r = ballRadius ?? Math.max(0.12, Math.min(0.6, h * 0.5));
    const center = ballCenter ?? (target.getCenter ? target.getCenter() : [0, 0, 0]);
    const ball = new ClayBall({ radius: r, color });
    ball.moveTo(center);

    // The subject is the mobject that actually morphs across the screen.
    const subject = mode === 'in' ? ball : target;
    // ClayMorph maps alpha->phases linearly; each phase applies its own easing.
    super(subject, { runTime, rateFunc: linear, ...opts });

    this.clay = ball;
    this.target = target;
    this.mode = mode;
    this.splits = splits;

    this.phases =
      mode === 'in'
        ? [
            { a: new ShowCreation(ball), span: [0, splits[0]] },
            { a: new Rotate(ball, spin), span: [splits[0], splits[1]] },
            { a: new Transform(ball, target), span: [splits[1], 1] },
          ]
        : [
            { a: new Transform(target, ball), span: [0, splits[0]] },
            { a: new Rotate(target, spin), span: [splits[0], splits[1]] },
            { a: new FadeOut(target), span: [splits[1], 1] },
          ];
    this._begun = this.phases.map(() => false);
    this._finished = this.phases.map(() => false);
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
    return [this.clay, this.target];
  }

  _ensure(i, toFinished) {
    if (!this._begun[i]) {
      this.phases[i].a.begin();
      this._begun[i] = true;
    }
    if (toFinished && !this._finished[i]) {
      this.phases[i].a.finish();
      this._finished[i] = true;
    }
  }

  interpolate(alpha) {
    const t = clip(alpha, 0, 1);
    for (let i = 0; i < this.phases.length; i++) {
      const [s, e] = this.phases[i].span;
      const isLast = i === this.phases.length - 1;
      if (t < e || isLast) {
        // Flush any earlier phases straight to their finished state.
        for (let j = 0; j < i; j++) this._ensure(j, true);
        // Don't re-touch this phase once finished (it would overwrite the
        // shared subject that the next phase is now driving).
        if (this._finished[i]) return this;
        this._ensure(i, false);
        const local = e > s ? clip((t - s) / (e - s), 0, 1) : 1;
        this.phases[i].a.interpolate(local);
        if (local >= 1) {
          this.phases[i].a.finish();
          this._finished[i] = true;
        }
        return this;
      }
    }
    return this;
  }
}

// Clay ball appears, is kneaded, and reshapes into `target`.
export class ClayIn extends ClayMorph {
  constructor(target, opts = {}) {
    super(target, { ...opts, mode: 'in' });
  }
}

// `target` collapses into a clay ball, is kneaded, and disappears.
export class ClayOut extends ClayMorph {
  constructor(target, opts = {}) {
    super(target, { ...opts, mode: 'out' });
  }
}
