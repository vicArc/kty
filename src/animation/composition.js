// Port of manimlib/animation/composition.py.

import { Animation, prepareAnimation } from './animation.js';
import { Group } from '../mobject/mobject.js';
import { clip } from '../foundation/simple_functions.js';
import { interpolate } from '../foundation/bezier.js';

const isOpts = (x) =>
  x && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Animation) && !x.build;

export class AnimationGroup extends Animation {
  constructor(...args) {
    let opts = {};
    if (args.length && isOpts(args[args.length - 1])) opts = args.pop();
    let animations = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    animations = animations.map(prepareAnimation);

    const group = new Group(...animations.map((a) => a.mobject));
    const { lagRatio = 0, ...rest } = opts;
    super(group, rest);
    this.animations = animations;
    this.lagRatio = lagRatio;
    this.buildAnimationsWithTimings();
    this.maxEndTime = Math.max(0, ...this.animsWithTimings.map((t) => t[2]));
    this.runTime = opts.runTime ?? this.maxEndTime;
  }

  buildAnimationsWithTimings() {
    this.animsWithTimings = [];
    let currTime = 0;
    for (const anim of this.animations) {
      const startTime = currTime;
      const endTime = startTime + anim.getRunTime();
      this.animsWithTimings.push([anim, startTime, endTime]);
      currTime = interpolate(startTime, endTime, this.lagRatio);
    }
  }

  getRunTime() {
    return this.runTime;
  }

  begin() {
    this.mobject.setAnimatingStatus(true);
    for (const anim of this.animations) anim.begin();
    return this;
  }

  finish() {
    for (const anim of this.animations) anim.finish();
    this.mobject.setAnimatingStatus(false);
  }

  interpolate(alpha) {
    const time = this.rateFunc(alpha) * this.maxEndTime;
    for (const [anim, startTime, endTime] of this.animsWithTimings) {
      const animTime = endTime - startTime || 1;
      const subAlpha = clip((time - startTime) / animTime, 0, 1);
      anim.interpolate(subAlpha);
    }
    return this;
  }

  cleanUpFromScene(scene) {
    for (const anim of this.animations) anim.cleanUpFromScene(scene);
  }
}

export class Succession extends AnimationGroup {
  constructor(...args) {
    let opts = {};
    if (args.length && isOpts(args[args.length - 1])) opts = args.pop();
    super(...args, { lagRatio: 1.0, ...opts });
  }
}

export class LaggedStart extends AnimationGroup {
  constructor(...args) {
    let opts = {};
    if (args.length && isOpts(args[args.length - 1])) opts = args.pop();
    super(...args, { lagRatio: 0.05, ...opts });
  }
}
