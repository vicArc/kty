import { describe, it, expect } from 'vitest';
import {
  FlashAround,
  FlashUnder,
  ShowCreationThenDestructionAround,
  ShowCreationThenFadeAround,
  ShowPassingFlash,
} from '../../src/animation/indication.js';
import { Succession } from '../../src/animation/composition.js';
import { Square } from '../../src/mobject/geometry.js';

describe('FlashAround / FlashUnder', () => {
  it('FlashAround flashes a surrounding rectangle around the mobject', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new FlashAround(sq, { buff: 0.1 });
    expect(anim).toBeInstanceOf(ShowPassingFlash);
    // The rectangle is bigger than the square it surrounds.
    expect(anim.mobject.getWidth()).toBeGreaterThan(2);
    expect(anim.isRemover()).toBe(true);
  });

  it('FlashUnder flashes a line beneath the mobject', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new FlashUnder(sq, { buff: 0.1 });
    expect(anim).toBeInstanceOf(ShowPassingFlash);
    expect(anim.mobject.getCenter()[1]).toBeLessThan(sq.getBottom()[1] + 1e-6);
  });

  it('the around variants build the right composite type', () => {
    const sq = new Square({ sideLength: 2 });
    expect(new ShowCreationThenDestructionAround(sq)).toBeInstanceOf(ShowPassingFlash);
    expect(new ShowCreationThenFadeAround(sq)).toBeInstanceOf(Succession);
  });
});
