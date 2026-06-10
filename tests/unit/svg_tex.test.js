import { describe, it, expect } from 'vitest';
import { parsePathD } from '../../src/mobject/svg/svg_path.js';
import { SVGMobject, VMobjectFromSVGPath } from '../../src/mobject/svg/svg_mobject.js';
import { Tex, TexText, latexToGlyphs } from '../../src/mobject/svg/tex_mobject.js';

describe('SVG path parser', () => {
  it('parses M/L/Q/Z into one closed subpath', () => {
    const sub = parsePathD('M0 0 L10 0 Q15 5 20 0 Z');
    expect(sub).toHaveLength(1);
    expect(sub[0].start).toEqual([0, 0]);
    expect(sub[0].closed).toBe(true);
    expect(sub[0].segments.map((s) => s.type)).toEqual(['line', 'quad']);
  });

  it('handles implicit line-tos after M and relative commands', () => {
    const sub = parsePathD('M0 0 1 0 l0 1'); // M then implicit L, then relative l
    expect(sub[0].segments).toHaveLength(2);
    expect(sub[0].segments[0].points[0]).toEqual([1, 0]);
    expect(sub[0].segments[1].points[0]).toEqual([1, 1]);
  });

  it('handles cubic and H/V', () => {
    const sub = parsePathD('M0 0 C1 1 2 1 3 0 H5 V2');
    const types = sub[0].segments.map((s) => s.type);
    expect(types).toEqual(['cubic', 'line', 'line']);
  });

  it('supports multiple subpaths', () => {
    const sub = parsePathD('M0 0 L1 0 M5 5 L6 5');
    expect(sub).toHaveLength(2);
  });
});

describe('SVGMobject', () => {
  it('builds a square VMobject from a path string', () => {
    const vm = new VMobjectFromSVGPath({ d: 'M-1 -1 L1 -1 L1 1 L-1 1 Z' });
    expect(vm.getWidth()).toBeCloseTo(2, 4);
    expect(vm.getHeight()).toBeCloseTo(2, 4);
  });

  it('applies an affine transform', () => {
    const vm = new VMobjectFromSVGPath({ d: 'M0 0 L1 0', transform: [2, 0, 0, 2, 1, 0] });
    expect(vm.getStart()[0]).toBeCloseTo(1, 4); // (0,0) -> (1,0)
    expect(vm.getEnd()[0]).toBeCloseTo(3, 4); // (1,0) -> (3,0)
  });

  it('SVGMobject groups one mobject per path', () => {
    const svg = new SVGMobject({ paths: ['M0 0 L1 0', 'M2 2 L3 2'] });
    expect(svg.submobjects).toHaveLength(2);
  });
});

describe('Tex (MathJax headless)', () => {
  it('converts LaTeX into glyph paths', () => {
    const glyphs = latexToGlyphs('x^2 + 1');
    expect(glyphs.length).toBeGreaterThan(2);
    expect(typeof glyphs[0].d).toBe('string');
    expect(glyphs[0].transform).toHaveLength(6);
  });

  it('builds a Tex mobject with glyph submobjects and finite bounds', () => {
    const tex = new Tex('x^2 + 1');
    expect(tex.submobjects.length).toBeGreaterThan(2);
    expect(Number.isFinite(tex.getWidth())).toBe(true);
    expect(tex.getWidth()).toBeGreaterThan(0);
    expect(tex.getHeight()).toBeGreaterThan(0);
    // centered on the origin
    expect(Math.abs(tex.getCenter()[0])).toBeLessThan(1e-6);
  });

  it('fontSize scales the result', () => {
    const small = new Tex('A', { fontSize: 24 });
    const big = new Tex('A', { fontSize: 96 });
    expect(big.getHeight()).toBeGreaterThan(small.getHeight() * 2);
  });

  it('TexText renders text mode', () => {
    const t = new TexText('Hi');
    expect(t.submobjects.length).toBeGreaterThan(0);
  });
});
