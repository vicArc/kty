// Screen-framing rectangles — port of manimlib/mobject/frame.py.
// ScreenRectangle has a fixed aspect ratio; the full-screen variants cover the
// whole camera frame (a backdrop, or a dimming overlay).

import { Rectangle } from './geometry.js';
import { BLACK, FRAME_HEIGHT } from '../foundation/constants.js';

// manim's GREY_E (not in kty's palette) — a near-black backdrop grey.
const GREY_E = '#222222';

/** A rectangle with a fixed aspect ratio (16:9 by default). */
export class ScreenRectangle extends Rectangle {
  constructor({ aspectRatio = 16 / 9, height = 4, ...rest } = {}) {
    super({ width: aspectRatio * height, height, ...rest });
  }
}

/** A filled rectangle covering the entire camera frame (a backdrop). */
export class FullScreenRectangle extends ScreenRectangle {
  constructor({
    height = FRAME_HEIGHT,
    fillColor = GREY_E,
    fillOpacity = 1,
    strokeWidth = 0,
    ...rest
  } = {}) {
    super({ height, fillColor, fillOpacity, strokeWidth, ...rest });
  }
}

/** A translucent black overlay over the whole frame — dims everything behind it. */
export class FullScreenFadeRectangle extends FullScreenRectangle {
  constructor({ strokeWidth = 0, fillColor = BLACK, fillOpacity = 0.7, ...rest } = {}) {
    super({ strokeWidth, fillColor, fillOpacity, ...rest });
  }
}
