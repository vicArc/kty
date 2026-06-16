import { describe, it, expect } from 'vitest';
import {
  Indicate,
  FocusOn,
  CircleIndicate,
  ShowPassingFlash,
  ShowCreationThenDestruction,
  ShowCreationThenFadeOut,
  Flash,
  WiggleOutThenIn,
} from '../../src/animation/indication.js';
import { Square, Circle } from '../../src/mobject/geometry.js';

const widthOf = (m) => {
  const bb = m.getBoundingBox();
  return bb[2][0] - bb[0][0];
};

describe('Indicate', () => {
  it('peaks scaled-up mid-animation then returns to size', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new Indicate(sq, { scaleFactor: 1.5 });
    anim.begin();
    anim.interpolate(0.5);
    expect(widthOf(sq)).toBeGreaterThan(2.1); // scaled up at the peak
    anim.interpolate(1.0);
    expect(widthOf(sq)).toBeCloseTo(2, 2); // back to original (there-and-back)
  });
});

describe('FocusOn', () => {
  it('is a remover and collapses a disc onto the point', () => {
    const anim = new FocusOn([1, 1, 0]);
    expect(anim.isRemover()).toBe(true);
    anim.begin();
    anim.interpolate(0);
    const w0 = widthOf(anim.mobject);
    anim.interpolate(1);
    const w1 = widthOf(anim.mobject);
    expect(w0).toBeGreaterThan(w1); // shrinks toward the focus point
  });
});

describe('CircleIndicate', () => {
  it('builds a removeable circle sized around the mobject', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new CircleIndicate(sq);
    expect(anim.isRemover()).toBe(true);
    anim.begin();
    anim.interpolate(0.5);
    // The indicating circle is at least as wide as the square's diagonal.
    expect(widthOf(anim.mobject)).toBeGreaterThan(2);
  });
});

describe('ShowPassingFlash', () => {
  it('reveals a moving sub-window of width ~timeWidth', () => {
    const anim = new ShowPassingFlash(new Circle({ radius: 1 }), { timeWidth: 0.2 });
    const [lo, hi] = anim.getBounds(0.5);
    expect(hi - lo).toBeCloseTo(0.2, 6);
    expect(anim.getBounds(0)).toEqual([0, 0]);
    // When the window's leading edge just reaches the end, it spans [0.8, 1].
    const [lo2, hi2] = anim.getBounds(1 / 1.2);
    expect(hi2).toBeCloseTo(1, 6);
    expect(lo2).toBeCloseTo(0.8, 6);
    // At alpha 1 the window has fully exited the path.
    expect(anim.getBounds(1)).toEqual([1, 1]);
  });

  it('ShowCreationThenDestruction defaults to a wide window', () => {
    const anim = new ShowCreationThenDestruction(new Circle({ radius: 1 }));
    expect(anim.timeWidth).toBe(2.0);
  });
});

describe('compositions', () => {
  it('ShowCreationThenFadeOut sequences two animations', () => {
    const anim = new ShowCreationThenFadeOut(new Square({ sideLength: 1 }));
    expect(anim.animations).toHaveLength(2);
  });

  it('Flash builds one passing-flash per radiating line', () => {
    const anim = new Flash([0, 0, 0], { numLines: 8 });
    expect(anim.lines.submobjects).toHaveLength(8);
    expect(anim.animations).toHaveLength(8);
  });
});

describe('WiggleOutThenIn', () => {
  it('returns the mobject to its start at alpha 0 and 1', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new WiggleOutThenIn(sq);
    anim.begin();
    anim.interpolate(0);
    expect(widthOf(sq)).toBeCloseTo(2, 4);
    anim.interpolate(1);
    expect(widthOf(sq)).toBeCloseTo(2, 4);
  });
});
