import { describe, it, expect } from 'vitest';
import { ConfigStore, DEFAULT_CONFIG, config } from '../../src/foundation/config.js';
import {
  lerp,
  lerpInto,
  resizePreservingOrderTyped,
  resizeWithInterpolationTyped,
} from '../../src/foundation/arrays.js';
import {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  COLORS,
  BLUE,
  UP,
  TAU,
  DEGREES,
} from '../../src/foundation/constants.js';

describe('config', () => {
  it('exposes ported defaults', () => {
    expect(config.get().camera.fps).toBe(30);
    expect(DEFAULT_CONFIG.sizes.frameHeight).toBe(8.0);
  });

  it('default config is frozen', () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
  });

  it('update deep-merges and notifies subscribers', () => {
    const store = new ConfigStore();
    let seen = null;
    const unsub = store.subscribe((c) => (seen = c));
    store.update({ camera: { fps: 60 } });
    expect(store.get().camera.fps).toBe(60);
    expect(store.get().camera.backgroundColor).toBe('#333333'); // untouched
    expect(seen.camera.fps).toBe(60);
    unsub();
    store.update({ camera: { fps: 24 } });
    expect(seen.camera.fps).toBe(60); // no longer notified
  });
});

describe('arrays (typed-column helpers)', () => {
  it('lerp / lerpInto', () => {
    expect([...lerp(new Float32Array([0, 0]), new Float32Array([10, 20]), 0.5)]).toEqual([5, 10]);
    const out = new Float32Array(2);
    lerpInto(out, new Float32Array([0, 0]), new Float32Array([2, 4]), 0.25);
    expect([...out]).toEqual([0.5, 1]);
  });

  it('resizePreservingOrderTyped (itemSize 3)', () => {
    const arr = new Float32Array([1, 1, 1, 2, 2, 2, 3, 3, 3]); // 3 rows
    expect([...resizePreservingOrderTyped(arr, 5, 3)]).toEqual([
      1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3,
    ]);
  });

  it('resizeWithInterpolationTyped (itemSize 2)', () => {
    const arr = new Float32Array([0, 0, 10, 20]); // 2 rows
    expect([...resizeWithInterpolationTyped(arr, 3, 2)]).toEqual([0, 0, 5, 10, 10, 20]);
  });
});

describe('constants', () => {
  it('frame geometry', () => {
    expect(FRAME_HEIGHT).toBe(8);
    expect(FRAME_WIDTH).toBeCloseTo(14.2222, 4);
  });

  it('palette and aliases', () => {
    expect(COLORS.BLUE_C).toBe('#58C4DD');
    expect(BLUE).toBe(COLORS.BLUE_C);
    expect(UP).toEqual([0, 1, 0]);
  });

  it('angles', () => {
    expect(TAU).toBeCloseTo(2 * Math.PI, 12);
    expect(DEGREES).toBeCloseTo(Math.PI / 180, 12);
  });
});
