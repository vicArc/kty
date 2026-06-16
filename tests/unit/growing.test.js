import { describe, it, expect } from 'vitest';
import {
  GrowFromPoint,
  GrowFromCenter,
  GrowFromEdge,
  GrowArrow,
  SpinInFromNothing,
} from '../../src/animation/growing.js';
import { Square, Arrow } from '../../src/mobject/geometry.js';
import { UP } from '../../src/foundation/constants.js';

const widthOf = (m) => {
  const bb = m.getBoundingBox();
  return bb[2][0] - bb[0][0];
};

describe('growing animations', () => {
  it('GrowFromPoint starts at ~zero size and ends full', () => {
    const sq = new Square({ sideLength: 2 }).shift([2, 0, 0]);
    const anim = new GrowFromPoint(sq, [0, 0, 0]);
    anim.begin();

    anim.interpolate(0);
    expect(widthOf(sq)).toBeLessThan(0.05); // collapsed to the point

    anim.interpolate(1);
    expect(widthOf(sq)).toBeCloseTo(2, 4); // back to full size
  });

  it('GrowFromCenter keeps the mobject centered as it grows', () => {
    const sq = new Square({ sideLength: 2 }).shift([1, 1, 0]);
    const anim = new GrowFromCenter(sq);
    anim.begin();
    anim.interpolate(0.0);
    expect(sq.getCenter()[0]).toBeCloseTo(1, 4);
    expect(sq.getCenter()[1]).toBeCloseTo(1, 4);
  });

  it('GrowFromEdge starts at the given edge', () => {
    const sq = new Square({ sideLength: 2 });
    const topBefore = sq.getBoundingBoxPoint(UP);
    const anim = new GrowFromEdge(sq, UP);
    anim.begin();
    anim.interpolate(0);
    // Collapsed at the top edge → center sits near the original top.
    expect(sq.getCenter()[1]).toBeCloseTo(topBefore[1], 3);
  });

  it('GrowArrow grows from the arrow tail', () => {
    const arrow = new Arrow({ start: [-2, 0, 0], end: [2, 0, 0] });
    const anim = new GrowArrow(arrow);
    anim.begin();
    anim.interpolate(0);
    expect(arrow.getCenter()[0]).toBeCloseTo(-2, 2);
  });

  it('SpinInFromNothing applies a non-zero path arc', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new SpinInFromNothing(sq);
    expect(anim.pathArc).not.toBe(0);
  });
});
