import { describe, it, expect } from 'vitest';
import { Homotopy, ComplexHomotopy, PhaseFlow } from '../../src/animation/movement.js';
import { ApplyWave, TurnInsideOut } from '../../src/animation/indication.js';
import { Square } from '../../src/mobject/geometry.js';
import { VMobject } from '../../src/mobject/vmobject.js';

describe('Homotopy', () => {
  it('deforms points by the time function and restores at t=0', () => {
    const sq = new Square({ sideLength: 2 });
    // Shift everything up by t.
    const anim = new Homotopy((x, y, z, t) => [x, y + t, z], sq);
    anim.begin();
    anim.interpolate(0);
    expect(sq.getCenter()[1]).toBeCloseTo(0, 5);
    anim.interpolate(1);
    expect(sq.getCenter()[1]).toBeCloseTo(1, 5);
  });
});

describe('ComplexHomotopy', () => {
  it('applies a complex map to (x, y)', () => {
    const sq = new Square({ sideLength: 2 });
    // Multiply by i at full time (rotate 90°): (re,im) -> (-im, re).
    const anim = new ComplexHomotopy((z, t) => ({ re: -z.im * t, im: z.re * t }), sq);
    anim.begin();
    anim.interpolate(1);
    // A corner at (1,1) maps to (-1,1).
    const xs = sq.getPoints().map((p) => p[0]);
    expect(Math.min(...xs)).toBeLessThan(-0.9);
  });
});

describe('PhaseFlow', () => {
  it('advances points along the field over virtual time', () => {
    const sq = new Square({ sideLength: 2 }).shift([1, 0, 0]);
    const anim = new PhaseFlow(() => [1, 0, 0], sq, { virtualTime: 1, rateFunc: (t) => t });
    anim.begin();
    anim.interpolate(0); // primes lastAlpha
    anim.interpolate(1); // dt = 1 → shift by +1 in x
    expect(sq.getCenter()[0]).toBeCloseTo(2, 4);
  });
});

describe('ApplyWave / TurnInsideOut', () => {
  it('ApplyWave returns the mobject to rest at the ends', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new ApplyWave(sq, { amplitude: 0.5 });
    anim.begin();
    anim.interpolate(0);
    expect(sq.getCenter()[1]).toBeCloseTo(0, 4);
    anim.interpolate(1);
    expect(sq.getCenter()[1]).toBeCloseTo(0, 4);
  });

  it('TurnInsideOut reverses the target winding', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new TurnInsideOut(sq);
    anim.begin();
    const orig = sq.getPoints();
    const target = anim.targetMobject.getPoints();
    // The target's first anchor is the original's last anchor.
    expect(target[0]).toEqual(orig[orig.length - 1]);
  });

  it('VMobject.reversePoints flips traversal order', () => {
    const vm = new VMobject().setPointsAsCorners([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ]);
    const first = vm.getPoints()[0];
    vm.reversePoints();
    expect(vm.getPoints()[vm.getNumPoints() - 1]).toEqual(first);
  });
});
