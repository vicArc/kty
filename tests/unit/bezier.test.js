import { describe, it, expect } from 'vitest';
import {
  bezier,
  interpolate,
  mid,
  inverseInterpolate,
  matchInterpolate,
  integerInterpolate,
  partialBezierPoints,
  partialQuadraticBezierPoints,
  quadraticBezierPointsForArc,
} from '../../src/foundation/bezier.js';

describe('bezier', () => {
  it('evaluates a linear bezier (scalar)', () => {
    const b = bezier([0, 1]);
    expect(b(0)).toBe(0);
    expect(b(0.5)).toBeCloseTo(0.5, 12);
    expect(b(1)).toBe(1);
  });

  it('evaluates a quadratic bezier (scalar)', () => {
    const b = bezier([0, 0, 1]); // (1-t)^0... = t^2
    expect(b(0.5)).toBeCloseTo(0.25, 12);
  });

  it('evaluates a vector bezier', () => {
    const b = bezier([
      [0, 0, 0],
      [2, 4, 0],
    ]);
    expect(b(0.5)).toEqual([1, 2, 0]);
  });

  it('interpolate / mid / inverse / match', () => {
    expect(interpolate(0, 10, 0.3)).toBeCloseTo(3, 12);
    expect(interpolate([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
    expect(mid(2, 4)).toBe(3);
    expect(inverseInterpolate(0, 10, 3)).toBeCloseTo(0.3, 12);
    expect(matchInterpolate(0, 100, 0, 10, 5)).toBeCloseTo(50, 12);
  });

  it('integerInterpolate matches the documented example', () => {
    const [v, r] = integerInterpolate(0, 10, 0.46);
    expect(v).toBe(4);
    expect(r).toBeCloseTo(0.6, 10);
    expect(integerInterpolate(0, 10, 1)).toEqual([9, 1.0]);
    expect(integerInterpolate(0, 10, 0)).toEqual([0, 0]);
  });

  it('partialBezierPoints of a line gives the sub-segment', () => {
    const pts = [
      [0, 0, 0],
      [1, 0, 0],
    ];
    const part = partialBezierPoints(pts, 0, 0.5);
    expect(part[0]).toEqual([0, 0, 0]);
    expect(part[1][0]).toBeCloseTo(0.5, 12);
  });

  it('partialQuadraticBezierPoints endpoints are on the curve', () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0],
    ];
    const part = partialQuadraticBezierPoints(pts, 0, 1);
    expect(part[0]).toEqual([0, 0, 0]);
    expect(part[2]).toEqual([2, 0, 0]);
  });

  it('quadraticBezierPointsForArc spans the requested angle', () => {
    const pts = quadraticBezierPointsForArc(Math.PI / 2);
    expect(pts[0][0]).toBeCloseTo(1, 12);
    expect(pts[0][1]).toBeCloseTo(0, 12);
    const last = pts[pts.length - 1];
    expect(last[0]).toBeCloseTo(0, 12);
    expect(last[1]).toBeCloseTo(1, 12);
  });
});
