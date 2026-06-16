import { describe, it, expect } from 'vitest';
import { Matrix, IntegerMatrix, MobjectMatrix } from '../../src/mobject/matrix.js';
import { Integer } from '../../src/mobject/numbers.js';
import { Square } from '../../src/mobject/geometry.js';

describe('Matrix', () => {
  it('lays out entries in a grid with two brackets', () => {
    const m = new Matrix([
      [1, 2],
      [3, 4],
    ]);
    expect(m.getEntries()).toHaveLength(4);
    expect(m.getRows().submobjects).toHaveLength(2);
    expect(m.getColumns().submobjects).toHaveLength(2);
    expect(m.getBrackets().submobjects).toHaveLength(2);
    // submobjects = 4 entries + 2 brackets
    expect(m.submobjects).toHaveLength(6);
  });

  it('positions columns left-to-right and rows top-to-bottom', () => {
    const m = new Matrix([
      [1, 2],
      [3, 4],
    ]);
    const [e00, e01] = [m.getRow(0).submobjects[0], m.getRow(0).submobjects[1]];
    expect(e01.getCenter()[0]).toBeGreaterThan(e00.getCenter()[0]); // col 1 right of col 0
    const e10 = m.getRow(1).submobjects[0];
    expect(e10.getCenter()[1]).toBeLessThan(e00.getCenter()[1]); // row 1 below row 0
  });

  it('brackets sit outside the entries', () => {
    const m = new Matrix([[1], [2]]);
    const [lb, rb] = m.getBrackets().submobjects;
    const xs = m.getEntries().map((e) => e.getCenter()[0]);
    expect(lb.getCenter()[0]).toBeLessThan(Math.min(...xs));
    expect(rb.getCenter()[0]).toBeGreaterThan(Math.max(...xs));
  });

  it('setColumnColors colors whole columns', () => {
    const m = new Matrix([
      [1, 2],
      [3, 4],
    ]);
    m.setColumnColors('#FF0000', '#00FF00');
    expect(m.getColumn(0).submobjects[0].getColor().toUpperCase()).toBe('#FF0000');
    expect(m.getColumn(1).submobjects[0].getColor().toUpperCase()).toBe('#00FF00');
  });

  it('IntegerMatrix uses Integer entries', () => {
    const m = new IntegerMatrix([[5, 6]]);
    expect(m.getEntries()[0]).toBeInstanceOf(Integer);
  });

  it('MobjectMatrix uses the given mobjects as entries', () => {
    const a = new Square({ sideLength: 1 });
    const b = new Square({ sideLength: 1 });
    const m = new MobjectMatrix([[a, b]]);
    expect(m.getEntries()).toContain(a);
    expect(m.getEntries()).toContain(b);
  });
});
