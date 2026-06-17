import { describe, it, expect } from 'vitest';
import { VERSION, FRAME_WIDTH, FRAME_HEIGHT, TAU } from '../../src/index.js';

describe('scaffold smoke', () => {
  it('exposes a semver version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('derives frame geometry from an 8-unit, 16:9 world', () => {
    expect(FRAME_HEIGHT).toBe(8);
    expect(FRAME_WIDTH).toBeCloseTo((8 * 16) / 9, 10);
  });

  it('has math constants', () => {
    expect(TAU).toBeCloseTo(2 * Math.PI, 12);
  });
});
