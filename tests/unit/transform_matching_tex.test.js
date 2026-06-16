import { describe, it, expect } from 'vitest';
import {
  TransformMatchingTex,
  TransformMatchingParts,
} from '../../src/animation/transform_matching_parts.js';
import { Tex } from '../../src/mobject/svg/tex_mobject.js';

describe('TransformMatchingTex', () => {
  it('is a TransformMatchingParts', () => {
    const a = new Tex('a');
    const b = new Tex('a');
    expect(new TransformMatchingTex(a, b)).toBeInstanceOf(TransformMatchingParts);
  });

  it('transforms shared glyphs and fades the rest', () => {
    const src = new Tex('a + b'); // glyphs: a, +, b
    const tgt = new Tex('a'); // glyph: a
    const anim = new TransformMatchingTex(src, tgt);
    const kinds = anim.animations.map((x) => x.constructor.name);
    // The shared 'a' transforms; '+' and 'b' fade out.
    expect(kinds.filter((k) => k === 'Transform')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'FadeOutToPoint')).toHaveLength(2);
  });

  it('fades in glyphs that only exist in the target', () => {
    const src = new Tex('a');
    const tgt = new Tex('a + c');
    const anim = new TransformMatchingTex(src, tgt);
    const kinds = anim.animations.map((x) => x.constructor.name);
    expect(kinds.filter((k) => k === 'Transform')).toHaveLength(1); // a↔a
    expect(kinds.filter((k) => k === 'FadeInFromPoint').length).toBeGreaterThanOrEqual(1);
  });
});
