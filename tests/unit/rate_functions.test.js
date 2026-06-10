import { describe, it, expect } from 'vitest';
import {
  linear,
  smooth,
  rushInto,
  rushFrom,
  slowInto,
  doubleSmooth,
  thereAndBack,
  thereAndBackWithPause,
  wiggle,
  squishRateFunc,
  lingering,
  exponentialDecay,
  notQuiteThere,
} from '../../src/foundation/rate_functions.js';

describe('rate_functions', () => {
  it('linear is identity', () => {
    expect(linear(0.37)).toBe(0.37);
  });

  it('smooth pins endpoints and midpoint', () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBeCloseTo(0.5, 12);
  });

  it('rushInto/rushFrom endpoints', () => {
    expect(rushInto(0)).toBeCloseTo(0, 12);
    expect(rushFrom(1)).toBeCloseTo(1, 12);
    expect(slowInto(1)).toBeCloseTo(1, 12);
  });

  it('doubleSmooth crosses 0.5 at the middle', () => {
    expect(doubleSmooth(0.5)).toBeCloseTo(0.5, 12);
    expect(doubleSmooth(0)).toBe(0);
    expect(doubleSmooth(1)).toBeCloseTo(1, 12);
  });

  it('thereAndBack returns to 0 at the ends and peaks at the middle', () => {
    expect(thereAndBack(0)).toBe(0);
    expect(thereAndBack(1)).toBeCloseTo(0, 12);
    expect(thereAndBack(0.5)).toBeCloseTo(1, 12);
  });

  it('thereAndBackWithPause holds at 1 through the pause', () => {
    expect(thereAndBackWithPause(0.5)).toBe(1);
  });

  it('wiggle is zero at the ends', () => {
    expect(wiggle(0)).toBeCloseTo(0, 12);
    expect(wiggle(1)).toBeCloseTo(0, 12);
  });

  it('squishRateFunc compresses into [a,b]', () => {
    const f = squishRateFunc(linear, 0.25, 0.75);
    expect(f(0.25)).toBeCloseTo(0, 12);
    expect(f(0.75)).toBeCloseTo(1, 12);
    expect(f(0.5)).toBeCloseTo(0.5, 12);
    expect(f(0.1)).toBe(linear(0));
  });

  it('lingering and exponentialDecay basics', () => {
    expect(lingering(0)).toBe(0);
    expect(exponentialDecay(0)).toBe(0);
    expect(exponentialDecay(1)).toBeGreaterThan(0.999);
  });

  it('notQuiteThere scales a rate function', () => {
    expect(notQuiteThere(linear, 0.7)(1)).toBeCloseTo(0.7, 12);
  });
});
