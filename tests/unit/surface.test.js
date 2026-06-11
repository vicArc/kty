import { describe, it, expect } from 'vitest';
import { Surface, ParametricSurface } from '../../src/mobject/surface.js';
import { Sphere, Torus, Square3D, Cube } from '../../src/mobject/three_dimensions.js';
import { buildSurfaceMesh, buildSurfaceObject3D } from '../../src/render/three/surface_geometry.js';

const norm = (v) => Math.hypot(v[0], v[1], v[2]);

describe('Surface', () => {
  it('samples an (nu, nv) grid and triangulates it', () => {
    const s = new ParametricSurface((u, v) => [u, v, 0], {
      uRange: [0, 1],
      vRange: [0, 1],
      resolution: [4, 5],
    });
    expect(s.renderType).toBe('surface');
    expect(s.getNumPoints()).toBe(4 * 5);
    // 2 triangles per quad, (nu-1)*(nv-1) quads, 3 indices each.
    expect(s.getTriangleIndices().length).toBe(6 * 3 * 4);
    // Indices stay within the vertex range.
    expect(Math.max(...s.getTriangleIndices())).toBeLessThan(20);
  });

  it('produces unit normals', () => {
    const s = new ParametricSurface((u, v) => [u, v, 0], { resolution: [3, 3] });
    const normals = s.getUnitNormals();
    for (let i = 0; i < s.getNumPoints(); i++) {
      expect(norm([normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]])).toBeCloseTo(1, 5);
    }
  });

  it('transforms d_normal_point with the points (normals survive scaling)', () => {
    const s = new Surface({ uvFunc: (u, v) => [u, v, 0], resolution: [3, 3] });
    s.scale(5);
    const normals = s.getUnitNormals();
    // Flat z-plane → all normals ±z, still unit length after scale.
    expect(norm([normals[0], normals[1], normals[2]])).toBeCloseTo(1, 5);
    expect(Math.abs(normals[2])).toBeCloseTo(1, 5);
  });
});

describe('3D primitives', () => {
  it('Sphere points sit on the radius with radial unit normals', () => {
    const sphere = new Sphere({ radius: 2, resolution: [20, 12] });
    expect(sphere.getNumPoints()).toBe(20 * 12);
    const pts = sphere.getPoints();
    for (const p of pts) expect(norm(p)).toBeCloseTo(2, 4);
    const normals = sphere.getUnitNormals();
    // Radial: normal direction matches the (unit) point direction.
    const p0 = pts[50];
    const n0 = [normals[150], normals[151], normals[152]];
    expect(norm(n0)).toBeCloseTo(1, 4);
    const dot = (p0[0] * n0[0] + p0[1] * n0[1] + p0[2] * n0[2]) / norm(p0);
    expect(dot).toBeCloseTo(1, 3);
  });

  it('Torus has the right tube radius', () => {
    const t = new Torus({ r1: 3, r2: 1, resolution: [16, 16] });
    const pts = t.getPoints();
    // Distance from the central ring (radius r1 in xy) is r2.
    for (const [x, y, z] of pts) {
      const ringDist = Math.hypot(Math.hypot(x, y) - 3, z);
      expect(ringDist).toBeCloseTo(1, 4);
    }
  });

  it('Square3D spans the side length', () => {
    const sq = new Square3D({ sideLength: 4, resolution: [2, 2] });
    expect(sq.renderType).toBe('surface');
    expect(sq.getWidth()).toBeCloseTo(4, 5);
    expect(sq.getHeight()).toBeCloseTo(4, 5);
  });

  it('Cube is six surface faces', () => {
    const cube = new Cube({ sideLength: 2 });
    const surfaces = cube.getFamily().filter((m) => m.renderType === 'surface');
    expect(surfaces).toHaveLength(6);
    // A 2-unit cube spans [-1, 1] in every dimension.
    expect(cube.getWidth()).toBeCloseTo(2, 5);
    expect(cube.getHeight()).toBeCloseTo(2, 5);
  });
});

describe('surface mesh builder', () => {
  it('builds a Mesh with matching position/index counts', () => {
    const s = new Sphere({ radius: 1, resolution: [10, 8] });
    const mesh = buildSurfaceMesh(s);
    expect(mesh.isMesh).toBe(true);
    expect(mesh.geometry.attributes.position.count).toBe(10 * 8);
    expect(mesh.geometry.attributes.normal.count).toBe(10 * 8);
    expect(mesh.geometry.index.count).toBe(s.getTriangleIndices().length);
  });

  it('wraps the mesh in a group carrying the mobject', () => {
    const s = new Square3D({ sideLength: 2 });
    const group = buildSurfaceObject3D(s);
    expect(group.userData.mobject).toBe(s);
    expect(group.children[0].isMesh).toBe(true);
  });
});
