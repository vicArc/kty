import { describe, it, expect } from 'vitest';
import { Cylinder, Cone, Line3D, Disk3D } from '../../src/mobject/three_dimensions.js';

const dims = (m) => {
  const bb = m.getBoundingBox();
  return {
    w: bb[2][0] - bb[0][0],
    h: bb[2][1] - bb[0][1],
    d: bb[2][2] - bb[0][2],
  };
};

describe('Cylinder', () => {
  it('has the given radius and height along OUT by default', () => {
    const c = new Cylinder({ radius: 2, height: 3, resolution: [40, 6] });
    expect(c.renderType).toBe('surface');
    const { w, d } = dims(c);
    expect(w).toBeCloseTo(4, 1); // diameter = 2*radius (polygon approx)
    expect(d).toBeCloseTo(3, 4); // height along z
  });

  it('orients along an arbitrary axis', () => {
    const c = new Cylinder({ radius: 0.5, height: 4, axis: [1, 0, 0], resolution: [40, 6] });
    const { w, d } = dims(c);
    expect(w).toBeCloseTo(4, 1); // height now along x
    expect(d).toBeCloseTo(1, 1); // diameter along z
  });
});

describe('Cone', () => {
  it('tapers to a point (width shrinks along its axis)', () => {
    const cone = new Cone({ radius: 1, height: 2, resolution: [40, 8] });
    expect(cone.renderType).toBe('surface');
    // The base ring (v=0) is wide; the tip (v=1) is a point.
    const { w } = dims(cone);
    expect(w).toBeGreaterThan(1.5);
  });
});

describe('Line3D', () => {
  it('spans from start to end', () => {
    const line = new Line3D({ start: [-2, 0, 0], end: [2, 0, 0], width: 0.1 });
    const { w } = dims(line);
    expect(w).toBeCloseTo(4, 2);
    expect(line.getCenter()[0]).toBeCloseTo(0, 3);
  });
});

describe('Disk3D', () => {
  it('is a flat disk of the given radius', () => {
    const disk = new Disk3D({ radius: 2, resolution: [2, 60] });
    const { w, d } = dims(disk);
    expect(w).toBeCloseTo(4, 1);
    expect(d).toBeCloseTo(0, 5); // flat in z
  });
});
