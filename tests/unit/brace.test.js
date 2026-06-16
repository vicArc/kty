import { describe, it, expect } from 'vitest';
import { Brace, BraceLabel } from '../../src/mobject/svg/brace.js';
import { Tex } from '../../src/mobject/svg/tex_mobject.js';
import { Square } from '../../src/mobject/geometry.js';
import { DOWN, UP } from '../../src/foundation/constants.js';

describe('Brace', () => {
  it('spans the width of the braced mobject', () => {
    const expr = new Tex('a+b+c');
    const brace = new Brace(expr, { direction: DOWN });
    expect(brace.getWidth()).toBeCloseTo(expr.getWidth(), 1);
  });

  it('sits below the mobject for direction DOWN, tip pointing down', () => {
    const sq = new Square({ sideLength: 2 });
    const brace = new Brace(sq, { direction: DOWN });
    expect(brace.getCenter()[1]).toBeLessThan(sq.getCenter()[1]); // below
    // tip is the lowest point and points downward from the brace center.
    expect(brace.getTip()[1]).toBeLessThan(brace.getCenter()[1]);
    expect(brace.getDirection()[1]).toBeLessThan(0);
  });

  it('sits above the mobject for direction UP', () => {
    const sq = new Square({ sideLength: 2 });
    const brace = new Brace(sq, { direction: UP });
    expect(brace.getCenter()[1]).toBeGreaterThan(sq.getCenter()[1]); // above
    expect(brace.getDirection()[1]).toBeGreaterThan(0);
  });

  it('getTex places a label past the tip', () => {
    const expr = new Tex('x');
    const brace = new Brace(expr, { direction: DOWN });
    const label = brace.getTex('n');
    expect(label.getCenter()[1]).toBeLessThan(brace.getTip()[1] + 1e-6); // below the tip
  });
});

describe('BraceLabel', () => {
  it('groups a brace and its label', () => {
    const expr = new Tex('a+b');
    const bl = new BraceLabel(expr, 'c', { braceDirection: DOWN });
    expect(bl.submobjects).toHaveLength(2);
    expect(bl.brace).toBeInstanceOf(Brace);
    expect(bl.label).toBeInstanceOf(Tex);
  });
});
