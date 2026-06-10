import { describe, it, expect } from 'vitest';
import {
  sigmoid,
  choose,
  genChoose,
  clip,
  fdiv,
  binarySearch,
  hashString,
} from '../../src/foundation/simple_functions.js';

describe('simple_functions', () => {
  it('sigmoid', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 12);
    expect(sigmoid(100)).toBeCloseTo(1, 6);
  });

  it('choose / genChoose', () => {
    expect(choose(5, 2)).toBe(10);
    expect(choose(0, 0)).toBe(1);
    expect(choose(10, 3)).toBe(120);
    expect(choose(5, 6)).toBe(0);
    expect(genChoose(5, 2)).toBe(10);
  });

  it('clip', () => {
    expect(clip(5, 0, 1)).toBe(1);
    expect(clip(-5, 0, 1)).toBe(0);
    expect(clip(0.5, 0, 1)).toBe(0.5);
  });

  it('fdiv handles 0/0', () => {
    expect(fdiv(1, 2)).toBe(0.5);
    expect(fdiv(0, 0, 7)).toBe(7);
    expect(fdiv(0, 0)).toBeNaN();
  });

  it('binarySearch finds a root of a monotonic function', () => {
    const found = binarySearch((x) => x, 0.5, 0, 1);
    expect(found).toBeCloseTo(0.5, 3);
  });

  it('hashString is deterministic and the right length', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
    expect(hashString('hello')).not.toBe(hashString('world'));
    expect(hashString('x', 16)).toHaveLength(16);
  });
});
