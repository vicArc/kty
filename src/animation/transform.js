// Port of manimlib/animation/transform.py (the core morph) + common variants.

import { Animation } from './animation.js';
import { registerTransform } from './animation_builder.js';
import { straightPath, pathAlongArc } from '../foundation/paths.js';

const zip = (arrays) => arrays[0].map((_, i) => arrays.map((a) => a[i]));

export class Transform extends Animation {
  replaceMobjectWithTargetInScene = false;

  constructor(
    mobject,
    targetMobject = null,
    { pathArc = 0, pathArcAxis, pathFunc = null, ...rest } = {}
  ) {
    super(mobject, rest);
    this.targetMobject = targetMobject;
    this.pathArc = pathArc;
    this.pathArcAxis = pathArcAxis;
    this.pathFunc = pathFunc;
    this.initPathFunc();
  }

  initPathFunc() {
    if (this.pathFunc !== null) return;
    if (this.pathArc === 0) this.pathFunc = straightPath;
    else this.pathFunc = pathAlongArc(this.pathArc, this.pathArcAxis);
  }

  createTarget() {
    return this.targetMobject;
  }

  begin() {
    this.targetMobject = this.createTarget();
    if (this.targetMobject == null) {
      throw new Error(`${this.constructor.name}.createTarget not implemented`);
    }
    if (this.mobject.isAlignedWith(this.targetMobject)) {
      this.targetCopy = this.targetMobject;
    } else {
      this.targetCopy = this.targetMobject.copy();
    }
    this.mobject.alignDataAndFamily(this.targetCopy);
    super.begin();
    return this;
  }

  getAllMobjects() {
    return [this.mobject, this.startingMobject, this.targetMobject, this.targetCopy];
  }

  getAllFamiliesZipped() {
    return zip([this.mobject, this.startingMobject, this.targetCopy].map((m) => m.getFamily()));
  }

  interpolateSubmobject(submob, start, targetCopy, alpha) {
    submob.interpolate(start, targetCopy, alpha, this.pathFunc);
  }

  cleanUpFromScene(scene) {
    super.cleanUpFromScene(scene);
    if (this.replaceMobjectWithTargetInScene) {
      scene.remove(this.mobject);
      scene.add(this.targetMobject);
    }
  }
}

export class ReplacementTransform extends Transform {
  replaceMobjectWithTargetInScene = true;
}

export class TransformFromCopy extends Transform {
  replaceMobjectWithTargetInScene = true;
  constructor(mobject, targetMobject, opts = {}) {
    super(mobject.copy(), targetMobject, opts);
  }
}

export class MoveToTarget extends Transform {
  constructor(mobject, opts = {}) {
    if (!mobject.target) throw new Error("MoveToTarget called on mobject without a 'target'");
    super(mobject, mobject.target, opts);
  }
}

/** Built by `.animate`: applies recorded methods to a copy and transforms to it. */
export class _MethodAnimation extends Transform {}

export class ApplyMethod extends Transform {
  constructor(method, mobject, args = [], opts = {}) {
    const target = mobject.copy();
    method.apply(target, args);
    super(mobject, target, opts);
  }
}

export class ScaleInPlace extends Transform {
  constructor(mobject, scaleFactor, opts = {}) {
    super(mobject, mobject.copy().scale(scaleFactor), opts);
  }
}

export class ShrinkToCenter extends ScaleInPlace {
  constructor(mobject, opts = {}) {
    super(mobject, 0, opts);
  }
}

export class FadeToColor extends Transform {
  constructor(mobject, color, opts = {}) {
    super(mobject, mobject.copy().setColor(color), opts);
  }
}

export class Restore extends Transform {
  constructor(mobject, opts = {}) {
    if (!mobject.savedState) throw new Error('Trying to Restore without a saved state');
    super(mobject, mobject.savedState, opts);
  }
}

registerTransform(Transform);
