import { describe, it, expect } from 'vitest';
import {
  ValueTracker,
  ExponentialValueTracker,
  ComplexValueTracker,
} from '../../src/mobject/value_tracker.js';

describe('ValueTracker', () => {
  it('get/set/increment a scalar', () => {
    const vt = new ValueTracker(5);
    expect(vt.getValue()).toBe(5);
    vt.setValue(10);
    expect(vt.getValue()).toBe(10);
    vt.incrementValue(2.5);
    expect(vt.getValue()).toBeCloseTo(12.5, 9);
  });

  it('is a Mobject (animatable like anything else)', () => {
    const vt = new ValueTracker(0);
    expect(typeof vt.addUpdater).toBe('function');
    vt.addUpdater((m, dt) => m.incrementValue(dt), false);
    vt.update(1);
    expect(vt.getValue()).toBeCloseTo(1, 9);
  });

  it('ExponentialValueTracker stores the log', () => {
    const vt = new ExponentialValueTracker(1);
    expect(vt.getValue()).toBeCloseTo(1, 9);
    vt.setValue(Math.E);
    expect(vt.getValue()).toBeCloseTo(Math.E, 9);
  });

  it('ComplexValueTracker holds a complex value', () => {
    const vt = new ComplexValueTracker({ re: 1, im: 2 });
    expect(vt.getValue()).toEqual({ re: 1, im: 2 });
  });
});
