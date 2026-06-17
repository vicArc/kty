import { describe, it, expect } from 'vitest';
import { VCube, VPrism, Dodecahedron, Prismify } from '../../src/mobject/three_dimensions.js';
import { Square } from '../../src/mobject/geometry.js';

describe('VCube', () => {
  it('has six depth-tested square faces', () => {
    const cube = new VCube({ sideLength: 2 });
    expect(cube.submobjects).toHaveLength(6);
    expect(cube.getFamily().every((m) => m.depthTest)).toBe(true);
  });

  it('spans the side length in every dimension', () => {
    const cube = new VCube({ sideLength: 3 });
    expect(cube.getWidth()).toBeCloseTo(3, 5);
    expect(cube.getHeight()).toBeCloseTo(3, 5);
    expect(cube.getDepth()).toBeCloseTo(3, 5);
  });
});

describe('VPrism', () => {
  it('stretches to independent width/height/depth', () => {
    const prism = new VPrism({ width: 4, height: 2, depth: 1 });
    expect(prism.getWidth()).toBeCloseTo(4, 4);
    expect(prism.getHeight()).toBeCloseTo(2, 4);
    expect(prism.getDepth()).toBeCloseTo(1, 4);
  });
});

describe('Dodecahedron', () => {
  it('has twelve pentagon faces, depth-tested', () => {
    const dod = new Dodecahedron();
    expect(dod.submobjects).toHaveLength(12);
    expect(dod.depthTest).toBe(true);
    // each face is a closed pentagon (5 anchors)
    expect(dod.submobjects[0].getVertices().length).toBe(5);
  });
});

describe('Prismify', () => {
  it('extrudes a flat polygon into walls + top + bottom', () => {
    const base = new Square({ sideLength: 2 });
    const solid = new Prismify(base, { depth: 1 });
    // bottom + 4 walls + top
    expect(solid.submobjects).toHaveLength(6);
    expect(solid.depthTest).toBe(true);
  });
});
