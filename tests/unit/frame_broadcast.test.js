import { describe, it, expect } from 'vitest';
import {
  ScreenRectangle,
  FullScreenRectangle,
  FullScreenFadeRectangle,
} from '../../src/mobject/frame.js';
import { Broadcast } from '../../src/animation/specialized.js';
import { FRAME_HEIGHT } from '../../src/foundation/constants.js';

describe('ScreenRectangle', () => {
  it('has the given aspect ratio', () => {
    const r = new ScreenRectangle({ height: 4, aspectRatio: 16 / 9 });
    expect(r.getHeight()).toBeCloseTo(4, 6);
    expect(r.getWidth() / r.getHeight()).toBeCloseTo(16 / 9, 6);
  });
});

describe('FullScreenRectangle', () => {
  it('fills the frame height and is opaque', () => {
    const r = new FullScreenRectangle();
    expect(r.getHeight()).toBeCloseTo(FRAME_HEIGHT, 6);
    expect(r.getFillOpacity()).toBe(1);
    expect(r.getStrokeWidth()).toBe(0);
  });
});

describe('FullScreenFadeRectangle', () => {
  it('is a translucent black overlay', () => {
    const r = new FullScreenFadeRectangle();
    expect(r.getFillOpacity()).toBeCloseTo(0.7, 6);
    expect(r.getFillColor().toUpperCase()).toBe('#000000');
  });
});

describe('Broadcast', () => {
  it('animates n concentric circles restoring outward', () => {
    const b = new Broadcast([0, 0, 0], { nCircles: 4, bigRadius: 3 });
    expect(b.animations).toHaveLength(4);
    expect(b.isRemover()).toBe(true);
    // each animated circle currently sits at the small radius (pre-restore)
    const circle = b.animations[0].mobject;
    expect(circle.getWidth()).toBeLessThan(0.5);
    // ...and its saved (target) state is the big radius
    expect(circle.savedState.getWidth()).toBeCloseTo(6, 4);
  });
});
