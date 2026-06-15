import { describe, it, expect } from 'vitest';
import { VectorField, StreamLines } from '../../src/mobject/vector_field.js';
import { Arrow } from '../../src/mobject/geometry.js';
import { Axes } from '../../src/mobject/coordinate_systems.js';

const axes = () => new Axes({ xRange: [-2, 2, 1], yRange: [-2, 2, 1] });

describe('VectorField', () => {
  it('makes one Arrow per non-zero sample', () => {
    const vf = new VectorField({
      func: (x, y) => [-y, x], // rotation, zero only at origin
      coordinateSystem: axes(),
      density: 1,
    });
    // 5x5 grid = 25 samples; the origin sample has zero magnitude → skipped.
    expect(vf.submobjects.length).toBe(24);
    expect(vf.submobjects.every((m) => m instanceof Arrow)).toBe(true);
  });

  it('honors a fixed color', () => {
    const vf = new VectorField({
      func: () => [1, 0],
      coordinateSystem: axes(),
      density: 1,
      color: '#FF0000',
    });
    expect(vf.submobjects[0].getStrokeColor().toUpperCase()).toBe('#FF0000');
  });

  it('clamps arrow length via tanh saturation', () => {
    const cs = axes();
    const vf = new VectorField({
      func: () => [100, 0], // huge field
      coordinateSystem: cs,
      density: 1,
    });
    const a = vf.submobjects[0];
    const len = Math.hypot(...a.getEnd().map((c, i) => c - a.getStart()[i]));
    // drawn length saturates near maxLen (< one grid step in screen units).
    const step = cs.getUnitSize ? cs.getUnitSize() : 1;
    expect(len).toBeLessThanOrEqual(step + 1e-6);
  });
});

describe('StreamLines', () => {
  it('integrates seeds into polyline VMobjects', () => {
    const sl = new StreamLines({
      func: (x, y) => [-y, x],
      coordinateSystem: axes(),
      density: 1,
      nSteps: 20,
      dt: 0.05,
    });
    expect(sl.submobjects.length).toBeGreaterThan(0);
    expect(sl.submobjects[0].getNumPoints()).toBeGreaterThan(2);
  });
});
