import { describe, it, expect } from 'vitest';
import { Tex } from '../../src/mobject/svg/tex_mobject.js';
import { VGroup } from '../../src/mobject/vmobject.js';

describe('Tex substring isolation', () => {
  it('finds each occurrence of a symbol', () => {
    const tex = new Tex('x^2 + 2xy + y^2');
    expect(tex.getParts('x')).toHaveLength(2);
    expect(tex.getParts('y')).toHaveLength(2);
    expect(tex.getPart('x')).toBeInstanceOf(VGroup);
  });

  it('returns no parts for an absent symbol', () => {
    const tex = new Tex('a + b');
    expect(tex.getParts('z')).toHaveLength(0);
    expect(tex.getPart('z')).toBeNull();
  });

  it('matches multi-glyph substrings', () => {
    const tex = new Tex('x^2 + y^2');
    // "x^2" is the first two glyphs (x and the superscript 2).
    const part = tex.getPart('x^2');
    expect(part).toBeInstanceOf(VGroup);
    expect(part.submobjects).toHaveLength(2);
  });

  it('setColorByTex colors all occurrences', () => {
    const tex = new Tex('x + x', { color: '#FFFFFF' });
    tex.setColorByTex('x', '#FF0000');
    const reds = tex.submobjects.filter((g) => g.getColor().toUpperCase() === '#FF0000');
    expect(reds.length).toBe(2);
  });

  it('texToColorMap colors at construction', () => {
    const tex = new Tex('x + y', {
      color: '#FFFFFF',
      texToColorMap: { x: '#FF0000', y: '#00FF00' },
    });
    const colors = tex.submobjects.map((g) => g.getColor().toUpperCase());
    expect(colors).toContain('#FF0000');
    expect(colors).toContain('#00FF00');
  });
});
