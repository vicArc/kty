import { describe, it, expect } from 'vitest';
import {
  cross,
  cross2d,
  dot,
  getNorm,
  getDist,
  normalize,
  midpoint,
  angleOfVector,
  angleBetweenVectors,
  rotationMatrix,
  rotateVector,
  rotateVector2d,
  applyMatrix,
} from '../../src/foundation/space_ops.js';

const closeVec = (a, b, p = 10) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

describe('space_ops', () => {
  it('cross / cross2d', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross2d([1, 0], [0, 1])).toBe(1);
  });

  it('norm / dist / dot', () => {
    expect(getNorm([3, 4, 0])).toBe(5);
    expect(getDist([0, 0, 0], [3, 4, 0])).toBe(5);
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('normalize and fallback', () => {
    closeVec(normalize([3, 4, 0]), [0.6, 0.8, 0]);
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0]);
    expect(normalize([0, 0, 0], [1, 0, 0])).toEqual([1, 0, 0]);
  });

  it('midpoint and angles', () => {
    expect(midpoint([0, 0, 0], [2, 4, 6])).toEqual([1, 2, 3]);
    expect(angleOfVector([0, 1])).toBeCloseTo(Math.PI / 2, 12);
    expect(angleBetweenVectors([1, 0, 0], [0, 1, 0])).toBeCloseTo(Math.PI / 2, 12);
  });

  it('rotationMatrix about z rotates +x to +y', () => {
    const m = rotationMatrix(Math.PI / 2, [0, 0, 1]);
    closeVec(applyMatrix(m, [1, 0, 0]), [0, 1, 0]);
  });

  it('rotateVector / rotateVector2d', () => {
    closeVec(rotateVector([1, 0, 0], Math.PI / 2, [0, 0, 1]), [0, 1, 0]);
    closeVec(rotateVector2d([1, 0], Math.PI / 2), [0, 1]);
  });
});
