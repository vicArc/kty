import { describe, it, expect } from 'vitest';
import { VMobject } from '../../src/mobject/vmobject.js';
import { quadraticBezierPointsForArc } from '../../src/foundation/bezier.js';
import { TAU } from '../../src/foundation/constants.js';

const closeVec = (a, b, p = 6) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

const line = () =>
  new VMobject().setPointsAsCorners([
    [0, 0, 0],
    [4, 0, 0],
  ]);

describe('VMobject curve info', () => {
  it('counts curves and reads nth curve points', () => {
    const l = line();
    expect(l.getNumCurves()).toBe(1);
    const tup = l.getNthCurvePoints(0);
    expect(tup[0]).toEqual([0, 0, 0]);
    expect(tup[2]).toEqual([4, 0, 0]);
  });

  it('pointFromProportion walks the path', () => {
    const l = line();
    closeVec(l.pointFromProportion(0), [0, 0, 0]);
    closeVec(l.pointFromProportion(0.5), [2, 0, 0]);
    closeVec(l.pointFromProportion(1), [4, 0, 0]);
  });

  it('getArcLength of a straight line equals its length', () => {
    expect(line().getArcLength()).toBeCloseTo(4, 6);
  });

  it('getArcLength of a unit circle ≈ 2π', () => {
    const circle = new VMobject().setPointsAsQuads(quadraticBezierPointsForArc(TAU));
    expect(circle.getArcLength()).toBeCloseTo(TAU, 1);
  });
});

describe('VMobject pointwiseBecomePartial', () => {
  it('truncates a line to its first half', () => {
    const l = line();
    const part = new VMobject();
    part.pointwiseBecomePartial(l, 0, 0.5);
    closeVec(part.getStart(), [0, 0, 0]);
    closeVec(part.getEnd(), [2, 0, 0]);
    expect(part.getNumPoints()).toBe(l.getNumPoints());
  });

  it('a==0,b==1 reproduces the path', () => {
    const l = line();
    const part = new VMobject();
    part.pointwiseBecomePartial(l, 0, 1);
    closeVec(part.getEnd(), [4, 0, 0]);
  });
});

describe('VMobject putStartAndEndOn', () => {
  it('maps the endpoints onto new positions', () => {
    const l = line();
    l.putStartAndEndOn([1, 1, 0], [1, 5, 0]);
    closeVec(l.getStart(), [1, 1, 0]);
    closeVec(l.getEnd(), [1, 5, 0]);
  });
});
