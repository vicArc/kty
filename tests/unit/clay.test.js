import { describe, it, expect } from 'vitest';
import {
  ClayBall,
  ClayBall3D,
  ClayStretch,
  ClaySmash,
  CLAY_COLORS,
  clayShow,
  clayDissolve,
} from '../../src/clay/clay.js';
import { ClayMorph, ClayIn, ClayOut, ClayPop, ClayPopOut } from '../../src/animation/clay.js';
import { Square } from '../../src/mobject/geometry.js';

describe('ClayBall', () => {
  it('is a flat filled clay dab with a customizable colour and radius', () => {
    const b = new ClayBall({ radius: 0.5, color: '#123456' });
    expect(b.hasPoints()).toBe(true);
    expect(b.getFillOpacity()).toBeCloseTo(1, 2);
    // Flat: no visible stroke.
    expect(b.getStrokeWidth()).toBeCloseTo(0, 5);
  });

  it('defaults to a warm terracotta tone', () => {
    expect(CLAY_COLORS.terracotta).toMatch(/^#/);
    expect(() => new ClayBall()).not.toThrow();
  });
});

describe('ClayMorph (claymation)', () => {
  it('defaults to a 0.3s transition with three phases', () => {
    const m = new ClayIn(new Square({ sideLength: 1 }));
    expect(m.runTime).toBeCloseTo(0.3, 5);
    expect(m.phases).toHaveLength(3);
  });

  it('honours custom timing, colour, size and start position', () => {
    const m = new ClayMorph(new Square({ sideLength: 1 }), {
      runTime: 0.8,
      color: CLAY_COLORS.ochre,
      ballRadius: 0.3,
      ballCenter: [2, 1, 0],
    });
    expect(m.runTime).toBeCloseTo(0.8, 5);
    expect(m.clay.getCenter()[0]).toBeCloseTo(2, 5);
    expect(m.clay.getCenter()[1]).toBeCloseTo(1, 5);
  });

  it('ClayIn reshapes the clay ball into the target (point-aligned)', () => {
    const target = new Square({ sideLength: 2 });
    const m = new ClayIn(target);
    m.begin();
    for (const a of [0, 0.25, 0.5, 0.75, 1]) expect(() => m.interpolate(a)).not.toThrow();
    m.finish();
    // After morphing, the clay shares the target's family structure.
    expect(m.clay.getFamily().length).toBe(target.getFamily().length);
  });

  it('ClayOut fades the target away by the end', () => {
    const target = new Square({ sideLength: 2, fillColor: '#b06a3c', fillOpacity: 1 });
    const m = new ClayOut(target);
    m.begin();
    for (const a of [0, 0.5, 1]) expect(() => m.interpolate(a)).not.toThrow();
    m.finish();
    expect(target.getFillOpacity()).toBeLessThan(0.1);
    expect(target.getStrokeOpacity()).toBeLessThan(0.1);
  });
});

describe('ClayPop (whole-object clay pop)', () => {
  it('defaults to a 0.3s overshoot pop and ends at full size', () => {
    const sq = new Square({ sideLength: 2 });
    const w0 = sq.getWidth();
    const m = new ClayPop(sq);
    expect(m.runTime).toBeCloseTo(0.3, 5);
    m.begin();
    expect(sq.getWidth()).toBeLessThan(w0 * 0.5); // collapsed at the start
    for (const a of [0.25, 0.5, 0.75]) expect(() => m.interpolate(a)).not.toThrow();
    m.finish();
    expect(sq.getWidth()).toBeCloseTo(w0, 2); // settled back to full size
  });

  it('overshoots past full size mid-pop', () => {
    const sq = new Square({ sideLength: 2 });
    const full = sq.getWidth();
    const m = new ClayPop(sq);
    m.begin();
    let peak = 0;
    for (let a = 0; a <= 1.0001; a += 0.05) {
      m.interpolate(Math.min(a, 1));
      peak = Math.max(peak, sq.getWidth());
    }
    expect(peak).toBeGreaterThan(full); // sprung past 100% before settling
  });
});

describe('ClayPopOut', () => {
  it('shrinks and fades the mobject away', () => {
    const sq = new Square({ sideLength: 2, fillColor: '#b06a3c', fillOpacity: 1 });
    const m = new ClayPopOut(sq);
    m.begin();
    m.interpolate(1);
    m.finish();
    expect(sq.getFillOpacity()).toBeLessThan(0.1);
  });
});

describe('ClayStretch (modeling-clay vector)', () => {
  it('2D: a blob at the start grows into a vector to the target', () => {
    const cs = new ClayStretch({ from: [0, 0], to: [3, 3], color: '#39c' });
    expect(cs.at(0)).toHaveLength(1); // just the clay blob, no vector yet
    const mid = cs.at(0.5);
    expect(mid.length).toBe(2); // arrow + blob
    const end = cs.at(1);
    const ball = end[end.length - 1];
    expect(ball.getCenter()[0]).toBeCloseTo(3, 2);
    expect(ball.getCenter()[1]).toBeCloseTo(3, 2);
  });

  it('3D: ball stretches along x,y,z to the target', () => {
    const cs = new ClayStretch({ from: [0, 0, 0], to: [2, 1, 3], threeD: true });
    const end = cs.at(1);
    const ball = end[end.length - 1];
    expect(ball.getCenter().map((n) => +n.toFixed(2))).toEqual([2, 1, 3]);
  });

  it('clamps alpha and works for any colour', () => {
    const cs = new ClayStretch({ from: [0, 0], to: [1, 0], color: '#ff00aa' });
    expect(() => cs.at(-1)).not.toThrow();
    expect(() => cs.at(2)).not.toThrow();
    expect(new ClayBall3D({ color: '#ff00aa' })).toBeTruthy();
  });
});

describe('ClaySmash (living clay ball — radial deformation)', () => {
  it('2D: returns a centred, filled outline at every phase of the cycle', () => {
    const s = new ClaySmash({ color: '#b06a3c' });
    for (const t of [0, 0.2, 0.4, 0.6, 0.79]) {
      const m = s.at(t);
      expect(m.hasPoints()).toBe(true);
      expect(m.getCenter().map((n) => +n.toFixed(1))).toEqual([0, 0, 0]);
    }
  });

  it('2D: the outline actually changes shape across the cycle (deformation)', () => {
    // baseRadius/sizes fixed so only the support-radius shape varies; compare
    // the width/height ratio at the round (circle) vs the polygon phase.
    const s = new ClaySmash({ sizes: [1, 1, 1], baseRadius: 1 });
    const circle = s.at(0); // pure circle
    const hexish = s.at(1 / 6); // mid circle→hexagon
    const ratio = (m) => m.getWidth() / m.getHeight();
    expect(Math.abs(ratio(circle) - 1)).toBeLessThan(0.02); // ~round
    expect(ratio(hexish)).not.toBeCloseTo(ratio(circle), 3); // deformed
  });

  it('3D: returns a deformed surface mesh at every phase', () => {
    const s = new ClaySmash({ threeD: true });
    for (const t of [0, 0.2, 0.5, 0.79]) {
      const m = s.at(t);
      expect(m.renderType).toBe('surface');
      expect(m.hasPoints()).toBe(true);
    }
  });

  it('accepts any colour and a custom cycle time', () => {
    expect(() => new ClaySmash({ color: '#ff00aa', cycle: 1.2 }).at(3.3)).not.toThrow();
  });

  it('continuously morphs the ball into a THIN directional vector', () => {
    const s = new ClaySmash({ baseRadius: 0.7 });
    const vec = s.at(0, { morph: 1, dir: [1, 0, 0], length: 5, thickness: 0.07 });
    // Long along the axis, thin across it (a line, not a fat blob).
    expect(vec.getWidth()).toBeGreaterThan(4);
    expect(vec.getHeight()).toBeLessThan(0.4);
    const s3 = new ClaySmash({ threeD: true, baseRadius: 0.7 });
    const v3 = s3.at(0, { morph: 1, dir: [1, 0, 0], length: 5, thickness: 0.07 });
    expect(v3.renderType).toBe('surface');
    expect(v3.getHeight()).toBeLessThan(0.4);
  });
});

describe('clay helpers', () => {
  it('clayShow / clayDissolve build kty animations over a set of balls', () => {
    const balls = [new ClayBall(), new ClayBall(), new ClayBall()];
    expect(() => clayShow(balls).begin()).not.toThrow();
    expect(() => clayDissolve(balls).begin()).not.toThrow();
  });
});
