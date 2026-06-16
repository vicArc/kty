import { describe, it, expect } from 'vitest';
import { approxSmoothQuadraticBezierHandles } from '../../src/foundation/bezier.js';
import { VMobject } from '../../src/mobject/vmobject.js';
import { Polygon, Square } from '../../src/mobject/geometry.js';

describe('approxSmoothQuadraticBezierHandles', () => {
  it('returns N-1 handles', () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0],
      [3, 1, 0],
    ];
    expect(approxSmoothQuadraticBezierHandles(pts)).toHaveLength(3);
  });

  it('gives midpoints for collinear anchors', () => {
    const h = approxSmoothQuadraticBezierHandles([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ]);
    expect(h[0][0]).toBeCloseTo(0.5, 6);
    expect(h[1][0]).toBeCloseTo(1.5, 6);
  });
});

describe('setPointsSmoothly', () => {
  it('keeps the anchors but adds curved handles', () => {
    const anchors = [
      [-2, 0, 0],
      [0, 2, 0],
      [2, 0, 0],
    ];
    const vm = new VMobject().setPointsSmoothly(anchors);
    // 3 anchors → 2 quadratic curves → 5 points
    expect(vm.getNumPoints()).toBe(5);
    const got = vm.getAnchors();
    anchors.forEach((a, i) => {
      expect(got[i][0]).toBeCloseTo(a[0], 5);
      expect(got[i][1]).toBeCloseTo(a[1], 5);
    });
    // The middle handle lifts off the straight chord (real curvature).
    const handle = vm.getPoints()[1];
    expect(handle[1]).toBeGreaterThan(0);
  });

  it('makeJagged sets handles to anchor midpoints', () => {
    const vm = new VMobject().setPointsSmoothly([
      [-2, 0, 0],
      [0, 2, 0],
      [2, 0, 0],
    ]);
    vm.makeJagged();
    const h0 = vm.getPoints()[1];
    expect(h0[0]).toBeCloseTo(-1, 5);
    expect(h0[1]).toBeCloseTo(1, 5);
  });
});

describe('Polygon.roundCorners', () => {
  it('rounds corners into arcs (more points, corners pulled in)', () => {
    const sq = new Square({ sideLength: 2 });
    const before = sq.getNumPoints();
    const cornerBefore = Math.max(...sq.getPoints().map((p) => p[0]));
    sq.roundCorners(0.4);
    expect(sq.getNumPoints()).toBeGreaterThan(before);
    // Rounded square still spans ~the same width.
    const cornerAfter = Math.max(...sq.getPoints().map((p) => p[0]));
    expect(cornerAfter).toBeCloseTo(cornerBefore, 4);
  });

  it('works on a generic Polygon with a default radius', () => {
    const tri = new Polygon({
      vertices: [
        [-1, -1, 0],
        [1, -1, 0],
        [0, 1, 0],
      ],
    });
    expect(() => tri.roundCorners()).not.toThrow();
    expect(tri.getNumPoints()).toBeGreaterThan(0);
  });
});
