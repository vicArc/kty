import { describe, it, expect } from 'vitest';
import {
  Transform,
  ShowCreation,
  Uncreate,
  FadeIn,
  FadeOut,
  Rotate,
  AnimationGroup,
  Succession,
  UpdateFromAlphaFunc,
} from '../../src/index.js';
import { VMobject } from '../../src/mobject/vmobject.js';
import { Square, Line } from '../../src/mobject/geometry.js';

const closeVec = (a, b, p = 5) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));
const seg = () =>
  new VMobject().setPointsAsCorners([
    [1, 0, 0],
    [2, 0, 0],
  ]);

describe('Transform', () => {
  it('interpolates a mobject from start to target', () => {
    const sq = new Square({ sideLength: 2 });
    const target = new Square({ sideLength: 2 }).shift([4, 0, 0]);
    const t = new Transform(sq, target);
    t.begin();
    t.interpolate(0);
    closeVec(sq.getCenter(), [0, 0, 0], 4);
    t.interpolate(0.5);
    closeVec(sq.getCenter(), [2, 0, 0], 4);
    t.interpolate(1);
    closeVec(sq.getCenter(), [4, 0, 0], 4);
  });

  it('aligns differing point counts before morphing', () => {
    const a = new VMobject().setPointsAsCorners([
      [0, 0, 0],
      [1, 0, 0],
    ]); // 3 points
    const b = new VMobject().setPointsAsCorners([
      [0, 0, 0],
      [1, 0, 0],
      [2, 1, 0],
    ]); // 5 points
    const t = new Transform(a, b);
    t.begin();
    expect(a.getNumPoints()).toBe(b.getNumPoints()); // aligned
  });
});

describe('ShowCreation / Uncreate', () => {
  it('reveals a line from nothing to full', () => {
    const line = new Line({ start: [0, 0, 0], end: [4, 0, 0] });
    const anim = new ShowCreation(line);
    anim.begin();
    anim.interpolate(0);
    closeVec(line.getEnd(), line.getStart(), 3); // collapsed to start
    anim.interpolate(0.5);
    expect(line.getEnd()[0]).toBeCloseTo(2, 2);
    anim.interpolate(1);
    closeVec(line.getEnd(), [4, 0, 0], 3);
  });

  it('Uncreate is a remover', () => {
    expect(new Uncreate(seg()).isRemover()).toBe(true);
  });
});

describe('Fade', () => {
  it('FadeIn animates opacity 0 → 1', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new FadeIn(sq);
    anim.begin();
    anim.interpolate(0);
    expect(sq.getStrokeOpacity()).toBeCloseTo(0, 5);
    anim.interpolate(1);
    expect(sq.getStrokeOpacity()).toBeCloseTo(1, 5);
  });

  it('FadeOut animates to 0 and removes', () => {
    const sq = new Square({ sideLength: 2 });
    const anim = new FadeOut(sq);
    expect(anim.isRemover()).toBe(true);
    anim.begin();
    anim.interpolate(1);
    expect(sq.getStrokeOpacity()).toBeCloseTo(0, 5);
  });
});

describe('Rotate', () => {
  it('rotates a segment 90° about its center', () => {
    const s = seg();
    const anim = new Rotate(s, Math.PI / 2);
    anim.begin();
    anim.interpolate(1);
    closeVec(s.getStart(), [1.5, -0.5, 0], 4);
    closeVec(s.getEnd(), [1.5, 0.5, 0], 4);
  });
});

describe('composition', () => {
  it('AnimationGroup with lagRatio 0 finishes children together', () => {
    const a = new FadeIn(new Square({ sideLength: 1 }));
    const b = new FadeIn(new Square({ sideLength: 1 }));
    const group = new AnimationGroup(a, b);
    expect(group.getRunTime()).toBeCloseTo(1, 5);
    group.begin();
    group.interpolate(1);
    expect(a.mobject.getStrokeOpacity()).toBeCloseTo(1, 5);
    expect(b.mobject.getStrokeOpacity()).toBeCloseTo(1, 5);
  });

  it('Succession runs animations sequentially (lagRatio 1)', () => {
    const a = new FadeIn(new Square({ sideLength: 1 }));
    const b = new FadeIn(new Square({ sideLength: 1 }));
    const succ = new Succession(a, b);
    expect(succ.getRunTime()).toBeCloseTo(2, 5);
    succ.begin();
    succ.interpolate(0.25); // first half: only `a` is underway
    expect(a.mobject.getStrokeOpacity()).toBeGreaterThan(0);
    expect(b.mobject.getStrokeOpacity()).toBeCloseTo(0, 5);
  });
});

describe('UpdateFromAlphaFunc', () => {
  it('drives a value via alpha', () => {
    const sq = new Square({ sideLength: 1 });
    const anim = new UpdateFromAlphaFunc(sq, (m, a) => m.setX(a * 10));
    anim.begin();
    anim.interpolate(1);
    expect(sq.getX()).toBeCloseTo(10, 4);
  });
});
