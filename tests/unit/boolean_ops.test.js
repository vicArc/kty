import { describe, it, expect } from 'vitest';
import { Union, Intersection, Difference, Exclusion } from '../../src/mobject/boolean_ops.js';
import { Circle, Square } from '../../src/mobject/geometry.js';

// Two unit circles, centers 1 apart (overlapping).
const pair = () => [
  new Circle({ radius: 1 }).shift([-0.5, 0, 0]),
  new Circle({ radius: 1 }).shift([0.5, 0, 0]),
];

describe('boolean ops', () => {
  it('Union spans both circles (width 3) as one outline', () => {
    const u = new Union(...pair());
    expect(u.getNumPoints()).toBeGreaterThan(0);
    expect(u.getWidth()).toBeCloseTo(3, 1);
    expect(u.getSubpaths()).toHaveLength(1);
  });

  it('Intersection is the lens between them (width 1)', () => {
    const i = new Intersection(...pair());
    expect(i.getWidth()).toBeCloseTo(1, 1);
    expect(i.getHeight()).toBeLessThan(2); // narrower than a full circle
  });

  it('Difference removes the clip, leaving a crescent', () => {
    const [a, b] = pair();
    const d = new Difference(a, b);
    expect(d.getNumPoints()).toBeGreaterThan(0);
    // left edge preserved, right edge eaten in → narrower than the source circle
    expect(d.getWidth()).toBeLessThan(2);
    expect(d.getWidth()).toBeGreaterThan(0.9);
  });

  it('Exclusion yields the two non-overlapping lobes', () => {
    const x = new Exclusion(...pair());
    expect(x.getSubpaths().length).toBeGreaterThanOrEqual(2);
    expect(x.getWidth()).toBeCloseTo(3, 1);
  });

  it('requires at least two mobjects', () => {
    expect(() => new Union(new Square())).toThrow(/at least 2/i);
    expect(() => new Intersection(new Square())).toThrow(/at least 2/i);
  });

  it('passes style options through to the result', () => {
    const u = new Union(...pair(), { fillColor: '#FC6255', fillOpacity: 1 });
    expect(u.getFillColor().toUpperCase()).toBe('#FC6255');
    expect(u.getFillOpacity()).toBe(1);
  });
});
