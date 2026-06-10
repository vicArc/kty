// Port of manimlib/animation/animation.py — the base Animation contract.

import { smooth } from '../foundation/rate_functions.js';
import { clip } from '../foundation/simple_functions.js';
import { removeListRedundancies } from '../foundation/iterables.js';
import { AnimationBuilder } from './animation_builder.js';

export const DEFAULT_ANIMATION_RUN_TIME = 1.0;
export const DEFAULT_ANIMATION_LAG_RATIO = 0;

const zip = (arrays) => arrays[0].map((_, i) => arrays.map((a) => a[i]));

export class Animation {
  constructor(
    mobject,
    {
      runTime = DEFAULT_ANIMATION_RUN_TIME,
      timeSpan = null,
      lagRatio = DEFAULT_ANIMATION_LAG_RATIO,
      rateFunc = smooth,
      name = '',
      remover = false,
      finalAlphaValue = 1.0,
      suspendMobjectUpdating = false,
    } = {}
  ) {
    this.mobject = mobject;
    this.runTime = runTime;
    this.timeSpan = timeSpan;
    this.lagRatio = lagRatio;
    this.rateFunc = rateFunc;
    this.name = name || this.constructor.name;
    this.remover = remover;
    this.finalAlphaValue = finalAlphaValue;
    this.suspendMobjectUpdating = suspendMobjectUpdating;
  }

  begin() {
    if (this.timeSpan !== null) this.runTime = Math.max(this.timeSpan[1], this.runTime);
    this.mobject.setAnimatingStatus(true);
    this.startingMobject = this.createStartingMobject();
    if (this.suspendMobjectUpdating) this.mobject.suspendUpdating();
    this.families = this.getAllFamiliesZipped();
    this.interpolate(0);
    return this;
  }

  finish() {
    this.interpolate(this.finalAlphaValue);
    this.mobject.setAnimatingStatus(false);
    if (this.suspendMobjectUpdating) this.mobject.resumeUpdating();
    return this;
  }

  cleanUpFromScene(scene) {
    if (this.isRemover()) scene.remove(this.mobject);
  }

  createStartingMobject() {
    return this.mobject.copy();
  }

  getAllMobjects() {
    return [this.mobject, this.startingMobject];
  }

  getAllFamiliesZipped() {
    return zip(this.getAllMobjects().map((m) => m.getFamily()));
  }

  updateMobjects(dt) {
    for (const mob of this.getAllMobjectsToUpdate()) mob.update(dt);
  }

  getAllMobjectsToUpdate() {
    return removeListRedundancies(this.getAllMobjects().filter((m) => m !== this.mobject));
  }

  // --- interpolation ---
  interpolate(alpha) {
    this.interpolateMobject(alpha);
    return this;
  }

  timeSpannedAlpha(alpha) {
    if (this.timeSpan !== null) {
      const [start, end] = this.timeSpan;
      return clip(alpha * this.runTime - start, 0, end - start) / (end - start);
    }
    return alpha;
  }

  interpolateMobject(alpha) {
    const n = this.families.length;
    this.families.forEach((mobs, i) => {
      const subAlpha = this.getSubAlpha(this.timeSpannedAlpha(alpha), i, n);
      this.interpolateSubmobject(...mobs, subAlpha);
    });
  }

  interpolateSubmobject(..._args) {
    // Implemented by subclasses.
  }

  getSubAlpha(alpha, index, numSubmobjects) {
    const lagRatio = this.lagRatio;
    const fullLength = (numSubmobjects - 1) * lagRatio + 1;
    const value = alpha * fullLength;
    const lower = index * lagRatio;
    return this.rateFunc(clip(value - lower, 0, 1));
  }

  // --- getters/setters ---
  getRunTime() {
    if (this.timeSpan) return Math.max(this.runTime, this.timeSpan[1]);
    return this.runTime;
  }
  setRunTime(runTime) {
    this.runTime = runTime;
    return this;
  }
  setRateFunc(rateFunc) {
    this.rateFunc = rateFunc;
    return this;
  }
  isRemover() {
    return this.remover;
  }
}

/** Coerce an Animation or an `.animate` builder into a concrete Animation. */
export function prepareAnimation(anim) {
  if (anim instanceof Animation) return anim;
  if (anim instanceof AnimationBuilder || (anim && typeof anim.build === 'function')) {
    return anim.build();
  }
  throw new TypeError('Object cannot be converted to an animation');
}
