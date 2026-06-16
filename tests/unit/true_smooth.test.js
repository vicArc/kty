import { describe, it, expect } from 'vitest';
import { getSmoothCubicBezierHandlePoints } from '../../src/foundation/bezier.js';
import { VMobject } from '../../src/mobject/vmobject.js';

describe('getSmoothCubicBezierHandlePoints', () => {
  it('returns a handle pair per segment', () => {
    const pts = [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0],
      [3, 1, 0],
    ];
    const [h1, h2] = getSmoothCubicBezierHandlePoints(pts);
    expect(h1).toHaveLength(3);
    expect(h2).toHaveLength(3);
  });

  it('handles a single segment (thirds)', () => {
    const [h1, h2] = getSmoothCubicBezierHandlePoints([
      [0, 0, 0],
      [3, 0, 0],
    ]);
    expect(h1[0][0]).toBeCloseTo(1, 6);
    expect(h2[0][0]).toBeCloseTo(2, 6);
  });
});

describe("makeSmooth('true_smooth')", () => {
  const anchors = [
    [-2, 0, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [2, 0, 0],
  ];

  it('adds more points than approx_smooth (two quads per segment)', () => {
    const approx = new VMobject().setPointsSmoothly(anchors, true);
    const trueSmooth = new VMobject().setPointsSmoothly(anchors, false);
    // approx: 3 segments → 7 points. true: 3 segments × 2 quads → 13 points.
    expect(approx.getNumPoints()).toBe(7);
    expect(trueSmooth.getNumPoints()).toBe(13);
  });

  it('passes through the original anchors', () => {
    const vm = new VMobject().setPointsSmoothly(anchors, false);
    const pts = vm.getPoints();
    // Segment endpoints (every 4 points) are the input anchors.
    anchors.forEach((a, i) => {
      const p = pts[i * 4];
      expect(p[0]).toBeCloseTo(a[0], 4);
      expect(p[1]).toBeCloseTo(a[1], 4);
    });
  });
});
