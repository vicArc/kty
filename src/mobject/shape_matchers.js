// Port of manimlib/mobject/shape_matchers.py — mobjects sized to fit others.

import { VGroup } from './vmobject.js';
import { Rectangle, Line } from './geometry.js';
import { SMALL_BUFF, YELLOW, RED, BLACK } from '../foundation/constants.js';

export class SurroundingRectangle extends Rectangle {
  constructor(mobject, { buff = SMALL_BUFF, color = YELLOW, ...style } = {}) {
    super({
      width: mobject.getWidth() + 2 * buff,
      height: mobject.getHeight() + 2 * buff,
      strokeColor: color,
      ...style,
    });
    this.moveTo(mobject.getCenter());
  }
}

export class BackgroundRectangle extends SurroundingRectangle {
  constructor(mobject, { buff = 0, color = BLACK, fillOpacity = 0.75, ...style } = {}) {
    super(mobject, { buff, color, ...style });
    this.setFill(color, fillOpacity);
    this.setStroke(null, 0, 0);
    this.setZIndex(mobject.zIndex - 1);
  }
}

export class Underline extends Line {
  constructor(mobject, { buff = SMALL_BUFF, strokeWidth = 4, ...style } = {}) {
    super({
      start: [mobject.getLeft()[0], 0, 0],
      end: [mobject.getRight()[0], 0, 0],
      strokeWidth,
      ...style,
    });
    const y = mobject.getBottom()[1] - buff;
    this.setY(y);
  }
}

export class Cross extends VGroup {
  constructor(mobject, { strokeColor = RED, strokeWidth = 6, ...style } = {}) {
    const w = mobject.getWidth() / 2;
    const h = mobject.getHeight() / 2;
    const c = mobject.getCenter();
    const corner = (sx, sy) => [c[0] + sx * w, c[1] + sy * h, 0];
    super(
      new Line({ start: corner(-1, 1), end: corner(1, -1), strokeColor, strokeWidth, ...style }),
      new Line({ start: corner(-1, -1), end: corner(1, 1), strokeColor, strokeWidth, ...style })
    );
  }
}
