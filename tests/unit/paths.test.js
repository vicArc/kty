import { describe, it, expect } from 'vitest';
import {
  straightPath,
  pathAlongArc,
  clockwisePath,
  counterclockwisePath,
} from '../../src/foundation/paths.js';

const closeVec = (a, b, p = 9) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

describe('paths', () => {
  it('straightPath linearly interpolates point sets', () => {
    expect(straightPath([[0, 0, 0]], [[2, 0, 0]], 0.5)).toEqual([[1, 0, 0]]);
  });

  it('pathAlongArc falls back to straight for tiny angles', () => {
    expect(pathAlongArc(0)).toBe(straightPath);
  });

  it('pathAlongArc endpoints coincide with start/end', () => {
    const path = pathAlongArc(Math.PI / 2);
    const start = [[1, 0, 0]];
    const end = [[0, 1, 0]];
    closeVec(path(start, end, 0)[0], [1, 0, 0]);
    closeVec(path(start, end, 1)[0], [0, 1, 0]);
  });

  it('clockwise / counterclockwise return arc paths', () => {
    expect(typeof clockwisePath()).toBe('function');
    expect(typeof counterclockwisePath()).toBe('function');
  });
});
