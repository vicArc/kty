// Clay effects (feature/clay-effects, 1.0.1) — warm matte "clay" primitives and
// build/dissolve animations for Algoramic's brand moments (loading spinner,
// welcome transfiguration, status log).
//
// A "clay ball" is a FLAT matte dab (a filled Circle), not a glossy 3D sphere:
// that matches Algoramic's flat / warm / hand-drawn language ("favour clean
// line art and the muted palette over glossy fills/gradients") and renders
// reliably in the 2D ortho scenes the articles use. The build/dissolve helpers
// are plain VMobject animations, so they compose with Scene.play.

import { Circle } from '../mobject/geometry.js';
import { LaggedStart } from '../animation/composition.js';
import { GrowFromCenter } from '../animation/growing.js';
import { FadeOut } from '../animation/fading.js';

export const CLAY_COLORS = {
  terracotta: '#b06a3c',
  ochre: '#9a7d3a',
  cream: '#f3ecdf',
};

// A flat, matte clay dab: a small filled circle in a warm earthy tone.
// `setColor` recolours it (e.g. per theme); `setOpacity` fades it.
export class ClayBall extends Circle {
  constructor(opts = {}) {
    const { radius = 0.12, color = CLAY_COLORS.terracotta, opacity = 1, ...rest } = opts;
    super({ radius, ...rest });
    this.setFill(color, opacity);
    this.setStroke(color, 0);
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
