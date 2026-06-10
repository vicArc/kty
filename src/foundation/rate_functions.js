// Port of manimlib/utils/rate_functions.py — easing functions [0,1] → R.

import { bezier } from './bezier.js';

export function linear(t) {
  return t;
}

/** Smoothstep with zero first and second derivatives at the ends. */
export function smooth(t) {
  const s = 1 - t;
  return t ** 3 * (10 * s * s + 5 * s * t + t * t);
}

export function rushInto(t) {
  return 2 * smooth(0.5 * t);
}

export function rushFrom(t) {
  return 2 * smooth(0.5 * (t + 1)) - 1;
}

export function slowInto(t) {
  return Math.sqrt(1 - (1 - t) * (1 - t));
}

export function doubleSmooth(t) {
  return t < 0.5 ? 0.5 * smooth(2 * t) : 0.5 * (1 + smooth(2 * t - 1));
}

export function thereAndBack(t) {
  const newT = t < 0.5 ? 2 * t : 2 * (1 - t);
  return smooth(newT);
}

export function thereAndBackWithPause(t, pauseRatio = 1 / 3) {
  const a = 2 / (1 - pauseRatio);
  if (t < 0.5 - pauseRatio / 2) return smooth(a * t);
  if (t < 0.5 + pauseRatio / 2) return 1;
  return smooth(a - a * t);
}

export function runningStart(t, pullFactor = -0.5) {
  return bezier([0, 0, pullFactor, pullFactor, 1, 1, 1])(t);
}

export function overshoot(t, pullFactor = 1.5) {
  return bezier([0, 0, pullFactor, pullFactor, 1, 1])(t);
}

export function notQuiteThere(func = smooth, proportion = 0.7) {
  return (t) => proportion * func(t);
}

export function wiggle(t, wiggles = 2) {
  return thereAndBack(t) * Math.sin(wiggles * Math.PI * t);
}

/** Squeeze a rate function into the sub-interval [a, b]. */
export function squishRateFunc(func, a = 0.4, b = 0.6) {
  return (t) => {
    if (a === b) return a;
    if (t < a) return func(0);
    if (t > b) return func(1);
    return func((t - a) / (b - a));
  };
}

export function lingering(t) {
  return squishRateFunc((x) => x, 0, 0.8)(t);
}

export function exponentialDecay(t, halfLife = 0.1) {
  return 1 - Math.exp(-t / halfLife);
}
