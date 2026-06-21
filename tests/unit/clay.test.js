import { describe, it, expect } from 'vitest';
import {
  ClayBall,
  ClayBall3D,
  ClayStretch,
  ClaySmash,
  ClayVector,
  CLAY_COLORS,
  clayShow,
  clayDissolve,
} from '../../src/clay/clay.js';
import { ClayIn, ClayOut, ClayPop, ClayPopOut } from '../../src/animation/clay.js';
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

describe('ClayVector (general build/dissolve pipeline)', () => {
  it('appears as a growing set of mobjects and holds a single formed vector', () => {
    const cv = new ClayVector({ dir: [1, 0, 0], length: 4 });
    // Early appear: the main blob + chain-merge balls.
    expect(cv.frame({ appear: 0.1 }).length).toBeGreaterThan(1);
    // Hold: exactly the one formed vector, long and thin.
    const held = cv.frame({ hold: true });
    expect(held).toHaveLength(1);
    expect(held[0].getWidth()).toBeGreaterThan(3);
    expect(held[0].getHeight()).toBeLessThan(0.5);
  });

  it('dissolves via two split half-pears, then nothing when gone', () => {
    const cv = new ClayVector({ dir: [1, 0, 0], length: 4 });
    expect(cv.frame({ vanish: 0.85 })).toHaveLength(2); // split into two
    expect(cv.frame({ gone: true })).toHaveLength(0);
  });

  it('works in 3D and never throws across the timeline', () => {
    const cv = new ClayVector({ threeD: true, dir: [2, 1, 3], length: 5 });
    for (const a of [0, 0.2, 0.5, 0.8, 1]) expect(() => cv.frame({ appear: a })).not.toThrow();
    for (const a of [0, 0.3, 0.6, 1]) expect(() => cv.frame({ vanish: a })).not.toThrow();
    expect(cv.frame({ hold: true })[0].renderType).toBe('surface');
  });
});

describe('ClayIn / ClayOut (clay build/dissolve animations)', () => {
  it('ClayIn builds the vector into a Group and ends holding it', () => {
    const m = new ClayIn(new ClayVector({ length: 4 }));
    m.begin();
    for (const a of [0, 0.25, 0.5, 0.75, 1]) expect(() => m.interpolate(a)).not.toThrow();
    m.finish();
    // After the build, the group holds the single formed vector.
    expect(m.mobject.submobjects).toHaveLength(1);
    expect(m.getAllMobjects()).toEqual([m.mobject]);
  });

  it('ClayOut starts from the formed mark and empties the group by the end', () => {
    const m = new ClayOut(new ClayVector({ length: 4 }));
    m.begin();
    expect(m.mobject.submobjects.length).toBeGreaterThan(0); // formed at the start
    for (const a of [0, 0.5, 1]) expect(() => m.interpolate(a)).not.toThrow();
    m.finish();
    expect(m.mobject.submobjects).toHaveLength(0); // gone
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

describe('ClaySmash (living clay ball — shape-sequence deformation)', () => {
  it('2D: returns a centred, filled outline across the sequence (time + progress)', () => {
    const s = new ClaySmash({ color: '#b06a3c' });
    for (const t of [0, 0.2, 0.4, 0.6, 0.79]) {
      const m = s.at({ time: t });
      expect(m.hasPoints()).toBe(true);
      expect(m.getCenter().map((n) => +n.toFixed(1))).toEqual([0, 0, 0]);
    }
    for (const pr of [0, 0.33, 0.66, 1]) {
      expect(s.at({ progress: pr }).hasPoints()).toBe(true);
    }
  });

  it('2D: the outline changes shape across the sequence (deformation)', () => {
    const s = new ClaySmash({ baseRadius: 1 });
    const ratio = (m) => m.getWidth() / m.getHeight();
    const circle = s.at({ progress: 0 }); // circle
    const dona = s.at({ progress: 1 }); // oval "dona"
    expect(Math.abs(ratio(circle) - 1)).toBeLessThan(0.02); // ~round
    expect(ratio(dona)).toBeGreaterThan(1.2); // oval (wider than tall)
  });

  it('3D: returns a deformed surface mesh across the sequence', () => {
    const s = new ClaySmash({ threeD: true });
    for (const pr of [0, 0.34, 0.67, 1]) {
      const m = s.at({ progress: pr });
      expect(m.renderType).toBe('surface');
      expect(m.hasPoints()).toBe(true);
    }
  });

  it('accepts any colour and a custom cycle time', () => {
    expect(() => new ClaySmash({ color: '#ff00aa', cycle: 1.2 }).at({ time: 3.3 })).not.toThrow();
  });

  it('continuously morphs into a THIN uniform directional vector', () => {
    const s = new ClaySmash({ baseRadius: 0.7 });
    const vec = s.at({
      progress: 1,
      vec: { morph: 1, dir: [1, 0, 0], length: 5, thickness: 0.07 },
    });
    expect(vec.getWidth()).toBeGreaterThan(4);
    expect(vec.getHeight()).toBeLessThan(0.4);
    const s3 = new ClaySmash({ threeD: true, baseRadius: 0.7 });
    const v3 = s3.at({
      progress: 1,
      vec: { morph: 1, dir: [1, 0, 0], length: 5, thickness: 0.07 },
    });
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
