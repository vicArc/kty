import { describe, it, expect } from 'vitest';
import { VMobject, VGroup } from '../../src/mobject/vmobject.js';
import { quadraticBezierPointsForArc } from '../../src/foundation/bezier.js';
import { TAU } from '../../src/foundation/constants.js';

const square = () =>
  new VMobject().setPointsAsCorners([
    [-1, -1, 0],
    [1, -1, 0],
    [1, 1, 0],
    [-1, 1, 0],
    [-1, -1, 0],
  ]);

describe('VMobject path building', () => {
  it('setPointsAsCorners makes one subpath of linear quadratics', () => {
    const s = square();
    // 5 corners -> 4 line segments -> 1 + 2*4 = 9 points
    expect(s.getNumPoints()).toBe(9);
    expect(s.getSubpaths().length).toBe(1);
  });

  it('getAnchors returns the corner points', () => {
    const s = square();
    const anchors = s.getAnchors();
    expect(anchors[0]).toEqual([-1, -1, 0]);
    expect(anchors).toHaveLength(5);
  });

  it('addQuadraticBezierCurveTo / addLineTo extend the current path', () => {
    const vm = new VMobject().startNewPath([0, 0, 0]);
    vm.addQuadraticBezierCurveTo([1, 1, 0], [2, 0, 0]);
    vm.addLineTo([4, 0, 0]);
    expect(vm.getNumPoints()).toBe(5);
    expect(vm.getLastPoint()).toEqual([4, 0, 0]);
  });

  it('setPointsAsQuads builds a circle from arc points', () => {
    const circle = new VMobject().setPointsAsQuads(quadraticBezierPointsForArc(TAU));
    expect(circle.getSubpaths().length).toBe(1);
    expect(circle.getNumPoints()).toBeGreaterThan(8);
  });

  it('multiple subpaths are tracked', () => {
    const vm = new VMobject();
    vm.startNewPath([0, 0, 0]);
    vm.addLineTo([1, 0, 0]);
    vm.startNewPath([5, 5, 0]);
    vm.addLineTo([6, 5, 0]);
    expect(vm.getSubpaths().length).toBe(2);
  });
});

describe('VMobject style', () => {
  it('defaults: visible stroke, no fill', () => {
    const s = square();
    expect(s.getStrokeWidth()).toBeGreaterThan(0);
    expect(s.getStrokeOpacity()).toBe(1);
    expect(s.getFillOpacity()).toBe(0);
  });

  it('setStroke / setFill', () => {
    const s = square();
    s.setStroke('#FF0000', 8, 0.5);
    expect(s.getStrokeColor()).toBe('#FF0000');
    expect(s.getStrokeWidth()).toBe(8);
    expect(s.getStrokeOpacity()).toBeCloseTo(0.5, 9);
    s.setFill('#00FF00', 1);
    expect(s.getFillColor()).toBe('#00FF00');
    expect(s.getFillOpacity()).toBe(1);
  });

  it('setColor sets both stroke and fill', () => {
    const s = square().setColor('#0000FF');
    expect(s.getStrokeColor()).toBe('#0000FF');
    expect(s.getFillColor()).toBe('#0000FF');
  });

  it('constructor style options apply', () => {
    const vm = new VMobject({ strokeColor: '#123456', fillColor: '#654321', fillOpacity: 1 });
    vm.setPointsAsCorners([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    // style set on defaults before points, then carried onto points
    expect(vm.getStrokeColor()).toBe('#123456');
  });

  it('VGroup recurses style to members', () => {
    const g = new VGroup(square(), square());
    g.setStroke('#ABCDEF', null, null);
    expect(g.submobjects[0].getStrokeColor()).toBe('#ABCDEF');
  });
});
