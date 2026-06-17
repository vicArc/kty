import { describe, it, expect } from 'vitest';
import { Sphere, SurfaceMesh } from '../../src/mobject/three_dimensions.js';
import { VMobject } from '../../src/mobject/vmobject.js';

describe('SurfaceMesh', () => {
  it('makes one line per u and v sample', () => {
    const sphere = new Sphere({ radius: 1, resolution: [20, 12] });
    const mesh = new SurfaceMesh(sphere, { resolution: [10, 6] });
    expect(mesh.submobjects).toHaveLength(16); // 10 u-lines + 6 v-lines
    expect(mesh.submobjects.every((m) => m instanceof VMobject)).toBe(true);
    expect(mesh.submobjects[0].getNumPoints()).toBeGreaterThan(2);
  });

  it('sits just outside the surface (nudged along the normal)', () => {
    const sphere = new Sphere({ radius: 2, resolution: [20, 12] });
    const mesh = new SurfaceMesh(sphere, { resolution: [8, 5], normalNudge: 0.05 });
    // A meridian's anchors should be ~radius + nudge from the centre.
    const pts = mesh.submobjects[0].getPoints();
    const r = Math.hypot(...pts[Math.floor(pts.length / 2)]);
    expect(r).toBeGreaterThan(2);
    expect(r).toBeLessThan(2.2);
  });
});
