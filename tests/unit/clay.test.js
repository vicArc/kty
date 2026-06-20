import { describe, it, expect } from 'vitest';
import { ClayBall, CLAY_COLORS, clayShow, clayDissolve } from '../../src/clay/clay.js';
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

describe('clay helpers', () => {
  it('clayShow / clayDissolve build kty animations over a set of balls', () => {
    const balls = [new ClayBall(), new ClayBall(), new ClayBall()];
    expect(() => clayShow(balls).begin()).not.toThrow();
    expect(() => clayDissolve(balls).begin()).not.toThrow();
  });
});
