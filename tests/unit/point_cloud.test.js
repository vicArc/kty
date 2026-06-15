import { describe, it, expect } from 'vitest';
import {
  PMobject,
  DotCloud,
  TrueDot,
  GlowDot,
  GlowDots,
  DEFAULT_DOT_RADIUS,
} from '../../src/mobject/point_cloud.js';
import { buildPoints, buildPointsObject3D } from '../../src/render/three/points_geometry.js';

describe('PMobject / DotCloud', () => {
  it('routes to the points render path', () => {
    expect(new DotCloud().renderType).toBe('points');
    expect(new PMobject().renderType).toBe('points');
  });

  it('addPoints grows the cloud and colors the new points', () => {
    const p = new PMobject();
    p.addPoints(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      { color: '#FF0000' }
    );
    expect(p.getNumPoints()).toBe(2);
    const rgba = p.data.getRow('rgba', 0);
    expect(rgba[0]).toBeCloseTo(1, 5); // red
    expect(rgba[1]).toBeCloseTo(0, 5);
  });

  it('DotCloud stores a per-point radius column', () => {
    const dc = new DotCloud({
      points: [
        [0, 0, 0],
        [1, 1, 0],
        [2, 0, 0],
      ],
      radius: 0.1,
    });
    expect(dc.getNumPoints()).toBe(3);
    expect(dc.getRadius()).toBeCloseTo(0.1, 6);
    const radii = dc.getRadii();
    expect(radii).toHaveLength(3);
    radii.forEach((r) => expect(r).toBeCloseTo(0.1, 6));
  });

  it('setRadii resizes radii to match the points', () => {
    const dc = new DotCloud({
      points: [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
      ],
    });
    dc.setRadii([0.2, 0.4]);
    const radii = dc.getRadii();
    expect(radii).toHaveLength(4);
    expect(radii[0]).toBeCloseTo(0.2, 5);
    expect(radii[3]).toBeCloseTo(0.4, 5);
  });

  it('default radius matches manim', () => {
    expect(new DotCloud({ points: [[0, 0, 0]] }).getRadius()).toBeCloseTo(DEFAULT_DOT_RADIUS, 6);
  });

  it('TrueDot is a single point; GlowDot carries a glow factor', () => {
    expect(new TrueDot({ center: [1, 2, 0] }).getNumPoints()).toBe(1);
    expect(new GlowDot().glowFactor).toBeGreaterThan(0);
    expect(new GlowDots({ points: [[0, 0, 0]] }).glowFactor).toBe(2);
  });
});

describe('points geometry builder', () => {
  it('builds THREE.Points with position/color/radius attributes', () => {
    const dc = new DotCloud({
      points: [
        [0, 0, 0],
        [1, 0, 0],
      ],
      radius: 0.08,
    });
    const pts = buildPoints(dc);
    expect(pts.isPoints).toBe(true);
    expect(pts.geometry.attributes.position.count).toBe(2);
    expect(pts.geometry.attributes.aColor.itemSize).toBe(4);
    expect(pts.geometry.attributes.aRadius.array[0]).toBeCloseTo(0.08, 5);
  });

  it('uses additive blending for glow dots', () => {
    const g = new GlowDots({ points: [[0, 0, 0]] });
    expect(buildPoints(g).material.uniforms.uGlowFactor.value).toBe(2);
  });

  it('returns an empty group for an empty cloud', () => {
    const group = buildPointsObject3D(new DotCloud());
    expect(group.children).toHaveLength(0);
  });
});
