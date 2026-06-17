import { describe, it, expect } from 'vitest';
import { Sphere } from '../../src/mobject/three_dimensions.js';
import { TexturedSurface, Surface } from '../../src/mobject/surface.js';

describe('TexturedSurface', () => {
  it('copies geometry from the source surface', () => {
    const sphere = new Sphere({ radius: 2, resolution: [12, 8] });
    const tex = new TexturedSurface(sphere, 'img.png');
    expect(tex.resolution).toEqual([12, 8]);
    expect(tex.data.length).toBe(sphere.data.length);
    // points should match the source sphere
    const a = tex.data.get('point');
    const b = sphere.data.get('point');
    expect(a[30]).toBeCloseTo(b[30], 6);
  });

  it('builds one (u,v) texture coordinate per vertex, v reversed', () => {
    const sphere = new Sphere({ radius: 1, resolution: [10, 6] });
    const tex = new TexturedSurface(sphere, 'img.png');
    expect(tex.imCoords.length).toBe(10 * 6 * 2);
    // first vertex: u=0, v=1 (top of reversed range)
    expect(tex.imCoords[0]).toBeCloseTo(0, 6);
    expect(tex.imCoords[1]).toBeCloseTo(1, 6);
  });

  it('remaps texture coords via setImageCoordsByUvFunc', () => {
    const sphere = new Sphere({ radius: 1, resolution: [4, 4] });
    const tex = new TexturedSurface(sphere, 'img.png');
    tex.setImageCoordsByUvFunc((u, v) => [u * 0.5, v]);
    expect(tex.imCoords[2]).toBeLessThanOrEqual(0.5);
  });

  it('rejects a non-Surface source', () => {
    expect(() => new TexturedSurface({}, 'img.png')).toThrow();
  });

  it('is a Surface (uses the renderer Mesh path)', () => {
    const tex = new TexturedSurface(new Sphere({ resolution: [4, 4] }), 'img.png');
    expect(tex).toBeInstanceOf(Surface);
    expect(tex.renderType).toBe('surface');
  });
});
