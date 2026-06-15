import { describe, it, expect } from 'vitest';
import { normalizeSceneResult, KtyScene, defineKtyScene } from '../../src/web/kty_scene.js';

describe('normalizeSceneResult', () => {
  it('wraps a bare array of mobjects', () => {
    expect(normalizeSceneResult([1, 2])).toEqual({
      mobjects: [1, 2],
      update: null,
      reorient: null,
    });
  });

  it('passes through the object form', () => {
    const update = () => {};
    expect(normalizeSceneResult({ mobjects: [1], update, reorient: [-30, 70] })).toEqual({
      mobjects: [1],
      update,
      reorient: [-30, 70],
    });
  });

  it('handles null / undefined', () => {
    expect(normalizeSceneResult(null)).toEqual({ mobjects: [], update: null, reorient: null });
    expect(normalizeSceneResult(undefined)).toEqual({ mobjects: [], update: null, reorient: null });
  });
});

describe('KtyScene module', () => {
  it('exports the element class and a (no-op in Node) define helper', () => {
    expect(typeof KtyScene).toBe('function');
    // customElements is undefined in Node, so this must not throw.
    expect(() => defineKtyScene()).not.toThrow();
  });
});
