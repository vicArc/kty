import { describe, it, expect } from 'vitest';
import {
  Arc,
  Circle,
  Ellipse,
  Dot,
  Line,
  Polygon,
  RegularPolygon,
  Triangle,
  Rectangle,
  Square,
  Arrow,
  Vector,
  ArrowTip,
  compassDirections,
} from '../../src/mobject/geometry.js';
import { SurroundingRectangle, Cross, Underline } from '../../src/mobject/shape_matchers.js';
import { TAU } from '../../src/foundation/constants.js';

const closeVec = (a, b, p = 5) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

describe('arcs & circles', () => {
  it('Circle has the right radius and center', () => {
    const c = new Circle({ radius: 2 }).shift([1, 1, 0]);
    expect(c.getRadius()).toBeCloseTo(2, 4);
    closeVec(c.getCenter(), [1, 1, 0], 4);
    expect(c.getStrokeColor()).toBe('#FC6255'); // default RED
  });

  it('Circle width equals diameter', () => {
    expect(new Circle({ radius: 1.5 }).getWidth()).toBeCloseTo(3, 4);
  });

  it('Arc spans the requested angle', () => {
    const a = new Arc({ angle: TAU / 2, radius: 1 });
    // quarter? half circle from angle 0 -> end at angle PI
    closeVec(a.getStart(), [1, 0, 0], 4);
    closeVec(a.getEnd(), [-1, 0, 0], 4);
  });

  it('Ellipse stretches to width/height', () => {
    const e = new Ellipse({ width: 4, height: 1 });
    expect(e.getWidth()).toBeCloseTo(4, 4);
    expect(e.getHeight()).toBeCloseTo(1, 4);
  });

  it('Dot is a small filled disc', () => {
    const d = new Dot({ point: [2, 0, 0] });
    expect(d.getFillOpacity()).toBe(1);
    expect(d.getStrokeWidth()).toBe(0);
    closeVec(d.getCenter(), [2, 0, 0], 4);
  });
});

describe('lines', () => {
  it('Line endpoints, length, angle', () => {
    const l = new Line({ start: [0, 0, 0], end: [3, 0, 0] });
    closeVec(l.getStart(), [0, 0, 0]);
    closeVec(l.getEnd(), [3, 0, 0]);
    expect(l.getLength()).toBeCloseTo(3, 5);
    expect(l.getAngle()).toBeCloseTo(0, 5);
  });

  it('buff shortens the line symmetrically', () => {
    const l = new Line({ start: [0, 0, 0], end: [4, 0, 0], buff: 0.5 });
    expect(l.getStart()[0]).toBeCloseTo(0.5, 4);
    expect(l.getEnd()[0]).toBeCloseTo(3.5, 4);
  });
});

describe('polygons', () => {
  it('Polygon vertices and closure', () => {
    const verts = [
      [-1, 0, 0],
      [1, 0, 0],
      [0, 2, 0],
    ];
    const p = new Polygon({ vertices: verts });
    expect(p.getVertices()).toHaveLength(3);
    closeVec(p.getVertices()[0], [-1, 0, 0]);
  });

  it('RegularPolygon / Triangle vertex counts', () => {
    expect(new RegularPolygon({ n: 5 }).getVertices()).toHaveLength(5);
    expect(new Triangle().getVertices()).toHaveLength(3);
  });

  it('Rectangle and Square sizes', () => {
    const r = new Rectangle({ width: 6, height: 2 });
    expect(r.getWidth()).toBeCloseTo(6, 4);
    expect(r.getHeight()).toBeCloseTo(2, 4);
    const s = new Square({ sideLength: 3 });
    expect(s.getWidth()).toBeCloseTo(3, 4);
    expect(s.getHeight()).toBeCloseTo(3, 4);
  });

  it('compassDirections returns n unit vectors', () => {
    expect(compassDirections(4)).toHaveLength(4);
    closeVec(compassDirections(4)[0], [1, 0, 0]);
  });
});

describe('arrows', () => {
  it('Arrow has a tip submobject pointing toward the end', () => {
    const a = new Arrow({ start: [0, 0, 0], end: [3, 0, 0] });
    expect(a.getTip()).toBeInstanceOf(ArrowTip);
    expect(a.submobjects).toContain(a.tip);
    // tip apex near the arrow end
    closeVec(a.tip.getTipPoint(), a.getEnd(), 4);
  });

  it('Vector starts at origin', () => {
    const v = new Vector({ direction: [0, 2, 0] });
    closeVec(v.getStart(), [0, 0, 0], 4);
  });
});

describe('shape matchers', () => {
  it('SurroundingRectangle wraps a mobject with buff', () => {
    const sq = new Square({ sideLength: 2 });
    const sr = new SurroundingRectangle(sq, { buff: 0.25 });
    expect(sr.getWidth()).toBeCloseTo(2.5, 4);
    closeVec(sr.getCenter(), sq.getCenter(), 4);
  });

  it('Cross is two crossing lines', () => {
    const cross = new Cross(new Square({ sideLength: 2 }));
    expect(cross.submobjects).toHaveLength(2);
  });

  it('Underline sits below the mobject', () => {
    const sq = new Square({ sideLength: 2 });
    const u = new Underline(sq, { buff: 0.1 });
    expect(u.getCenter()[1]).toBeLessThan(sq.getBottom()[1] + 1e-6);
  });
});
