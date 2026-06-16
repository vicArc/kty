import { describe, it, expect } from 'vitest';
import {
  TransformMatchingShapes,
  TransformMatchingParts,
} from '../../src/animation/transform_matching_parts.js';
import { Transform } from '../../src/animation/transform.js';
import { Square, Circle } from '../../src/mobject/geometry.js';
import { VGroup } from '../../src/mobject/vmobject.js';

describe('Mobject.hasSameShapeAs', () => {
  it('matches the same shape up to translation and scale', () => {
    const a = new Square({ sideLength: 2 });
    const b = new Square({ sideLength: 5 }).shift([3, -1, 0]);
    expect(a.hasSameShapeAs(b)).toBe(true);
  });

  it('distinguishes different shapes', () => {
    expect(new Square({ sideLength: 2 }).hasSameShapeAs(new Circle({ radius: 1 }))).toBe(false);
  });
});

describe('TransformMatchingShapes', () => {
  it('transforms a matching part and fades the rest', () => {
    // source: [square, circle]; target: [square]  → square transforms, circle fades out.
    const sqA = new Square({ sideLength: 2 }).shift([-2, 0, 0]);
    const ci = new Circle({ radius: 1 }).shift([2, 0, 0]);
    const source = new VGroup(sqA, ci);
    const target = new VGroup(new Square({ sideLength: 2.2 }).shift([0, 1, 0]));

    const anim = new TransformMatchingShapes(source, target);
    const kinds = anim.animations.map((a) => a.constructor.name);
    expect(kinds.filter((k) => k === 'Transform')).toHaveLength(1); // square↔square
    expect(kinds.filter((k) => k === 'FadeOutToPoint')).toHaveLength(1); // circle fades out
    expect(anim.animations).toHaveLength(2);
  });

  it('fades in target-only parts', () => {
    const source = new VGroup(new Square({ sideLength: 2 }));
    const target = new VGroup(
      new Square({ sideLength: 2 }).shift([0, 1, 0]),
      new Circle({ radius: 1 }).shift([2, 0, 0])
    );
    const anim = new TransformMatchingShapes(source, target);
    const kinds = anim.animations.map((a) => a.constructor.name);
    expect(kinds).toContain('Transform'); // square↔square
    expect(kinds.filter((k) => k === 'FadeInFromPoint')).toHaveLength(1); // new circle fades in
  });

  it('honors explicit matched pairs', () => {
    const sqA = new Square({ sideLength: 2 });
    const ciB = new Circle({ radius: 1 });
    const source = new VGroup(sqA);
    const target = new VGroup(ciB);
    // Force the (different-shape) pair to transform via the mismatch animation.
    const anim = new TransformMatchingParts(source, target, { matchedPairs: [[sqA, ciB]] });
    expect(anim.animations.map((a) => a.constructor.name)).toEqual(['Transform']);
    expect(anim.animations[0]).toBeInstanceOf(Transform);
  });

  it('exposes source/target for scene cleanup', () => {
    const source = new VGroup(new Square({ sideLength: 2 }));
    const target = new VGroup(new Square({ sideLength: 2 }));
    const anim = new TransformMatchingShapes(source, target);
    expect(anim.targetMob).toBe(target);
  });
});
