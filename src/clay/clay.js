// Clay effects (feature/clay-effects, 1.0.1) — warm matte "clay" primitives and
// build/dissolve animations for Algoramic's brand moments (loading spinner,
// welcome transfiguration, status log). Built on the existing Sphere + animation
// system; richer glyph-from-balls / dissolve-to-clay land iteratively.

import { Sphere } from '../mobject/three_dimensions.js';
import { LaggedStart } from '../animation/composition.js';
import { GrowFromCenter } from '../animation/growing.js';
import { FadeOut } from '../animation/fading.js';

export const CLAY_COLORS = {
  terracotta: '#b06a3c',
  ochre: '#9a7d3a',
  cream: '#f3ecdf',
};

// A single clay ball: a low-resolution sphere (cheap, soft-reading).
export class ClayBall extends Sphere {
  constructor(opts = {}) {
    const { radius = 0.12, ...rest } = opts;
    super({ radius, resolution: [16, 10], ...rest });
  }
}

// Stagger-grow a set of clay balls into existence (a clay take on ShowCreation).
export function clayShow(balls, { lagRatio = 0.05 } = {}) {
  return new LaggedStart(
    balls.map((b) => new GrowFromCenter(b)),
    { lagRatio }
  );
}

// Fade/sink a set of clay balls away (dissolve to clay and disappear).
export function clayDissolve(balls, { lagRatio = 0.03, shift = [0, -0.5, 0] } = {}) {
  return new LaggedStart(
    balls.map((b) => new FadeOut(b, { shift })),
    { lagRatio }
  );
}
