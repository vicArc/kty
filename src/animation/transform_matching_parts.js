// Transform one mobject into another by matching sub-parts (port of
// transform_matching_parts.py). Leaf pieces with the same shape transform into
// each other; unmatched source pieces fade out to the target's center and
// unmatched target pieces fade in from the source's center.
//
// TransformMatchingStrings/Tex (substring-key matching) need StringMobject
// substring isolation (S7.3), which isn't ported yet — deferred.

import { AnimationGroup } from './composition.js';
import { Transform } from './transform.js';
import { FadeInFromPoint, FadeOutToPoint } from './fading.js';

export class TransformMatchingParts extends AnimationGroup {
  constructor(
    source,
    target,
    {
      matchedPairs = [],
      matchAnimation = Transform,
      mismatchAnimation = Transform,
      runTime = 2,
      lagRatio = 0,
      ...animConfig
    } = {}
  ) {
    const sourcePieces = source.familyMembersWithPoints();
    const targetPieces = target.familyMembersWithPoints();
    const usedSource = new Set();
    const usedTarget = new Set();
    const anims = [];

    const addTransform = (src, tgt) => {
      const ns = src.familyMembersWithPoints();
      const nt = tgt.familyMembersWithPoints();
      if (ns.length === 0 || nt.length === 0) return;
      if (!ns.every((c) => sourcePieces.includes(c) && !usedSource.has(c))) return;
      if (!nt.every((c) => targetPieces.includes(c) && !usedTarget.has(c))) return;
      const Type = src.hasSameShapeAs(tgt) ? matchAnimation : mismatchAnimation;
      anims.push(new Type(src, tgt, animConfig));
      ns.forEach((c) => usedSource.add(c));
      nt.forEach((c) => usedTarget.add(c));
    };

    // 1) User-specified pairs (may be groups, e.g. substrings).
    for (const [src, tgt] of matchedPairs) addTransform(src, tgt);

    // 2) Auto-match remaining leaves by shape.
    for (const src of sourcePieces) {
      if (usedSource.has(src)) continue;
      const match = targetPieces.find((t) => !usedTarget.has(t) && src.hasSameShapeAs(t));
      if (match) addTransform(src, match);
    }

    // 3) Fade the leftovers.
    for (const src of sourcePieces) {
      if (!usedSource.has(src)) anims.push(new FadeOutToPoint(src, target.getCenter(), animConfig));
    }
    for (const tgt of targetPieces) {
      if (!usedTarget.has(tgt))
        anims.push(new FadeInFromPoint(tgt, source.getCenter(), animConfig));
    }

    super(anims, { runTime, lagRatio });
    this.sourceMob = source;
    this.targetMob = target;
  }

  cleanUpFromScene(scene) {
    super.cleanUpFromScene(scene);
    scene.remove(this.mobject);
    scene.add(this.targetMob);
  }
}

/** Match parts purely by shape (the common case). */
export class TransformMatchingShapes extends TransformMatchingParts {}
