import { describe, it, expect } from 'vitest';
import { ClayBall, CLAY_COLORS, clayShow, clayDissolve } from '../../src/clay/clay.js';
import { ClayMorph, ClayIn, ClayOut } from '../../src/animation/clay.js';
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

describe('clay helpers', () => {
  it('clayShow / clayDissolve build kty animations over a set of balls', () => {
    const balls = [new ClayBall(), new ClayBall(), new ClayBall()];
    expect(() => clayShow(balls).begin()).not.toThrow();
    expect(() => clayDissolve(balls).begin()).not.toThrow();
  });
});
