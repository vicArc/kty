// Brace (S7.5) — port of brace.py. A curly brace spanning a mobject, built from
// a Tex \underbrace. manim stretches only the brace's middle rects (relying on a
// 6-glyph decomposition); kty stretches the whole brace to the target width,
// which is simpler and robust to MathJax's glyph structure.

import { Tex } from './tex_mobject.js';
import { Text } from './text_mobject.js';
import { VGroup } from '../vmobject.js';
import { getNorm } from '../../foundation/space_ops.js';
import {
  DOWN,
  ORIGIN,
  OUT,
  UL,
  DL,
  DR,
  PI,
  SMALL_BUFF,
  DEFAULT_MOBJECT_TO_MOBJECT_BUFF,
} from '../../foundation/constants.js';

const sub = (a, b) => a.map((x, i) => x - b[i]);

export class Brace extends Tex {
  constructor(mobject, { direction = DOWN, buff = 0.2, ...opts } = {}) {
    super('\\underbrace{\\qquad}', opts);

    // Rotate the world so `direction` points down, build a downward brace under
    // the (rotated) mobject's width, then rotate everything back.
    const angle = -Math.atan2(direction[0], direction[1]) + PI;
    mobject.rotate(-angle, OUT, { aboutPoint: ORIGIN });
    const left = mobject.getCorner(DL);
    const right = mobject.getCorner(DR);
    const targetWidth = right[0] - left[0];

    this.tipPointIndex = argminY(this.getAllPoints());
    if (targetWidth > 0) this.setWidth(targetWidth, { stretch: true });
    this.shift(sub(left, this.getCorner(UL)).map((c, i) => c + buff * DOWN[i]));

    mobject.rotate(angle, OUT, { aboutPoint: ORIGIN });
    this.rotate(angle, OUT, { aboutPoint: ORIGIN });
    this.braceDirection = direction;
  }

  getTip() {
    return this.getAllPoints()[this.tipPointIndex];
  }

  getDirection() {
    const vect = sub(this.getTip(), this.getCenter());
    const n = getNorm(vect) || 1;
    return vect.map((c) => c / n);
  }

  /** Place a mobject just past the brace's tip. */
  putAtTip(mob, { buff = DEFAULT_MOBJECT_TO_MOBJECT_BUFF } = {}) {
    const dir = this.getDirection().map((c) => Math.round(c));
    mob.nextTo(this.getTip(), dir, buff);
    return this;
  }

  getText(text, { buff = SMALL_BUFF, ...opts } = {}) {
    const textMob = new Text(text, opts);
    this.putAtTip(textMob, { buff });
    return textMob;
  }

  getTex(tex, { buff = SMALL_BUFF, ...opts } = {}) {
    const texMob = new Tex(tex, opts);
    this.putAtTip(texMob, { buff });
    return texMob;
  }
}

function argminY(points) {
  let idx = 0;
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    if (points[i][1] < min) {
      min = points[i][1];
      idx = i;
    }
  }
  return idx;
}

/** A brace plus a label placed at its tip. */
export class BraceLabel extends VGroup {
  constructor(
    obj,
    text,
    {
      braceDirection = DOWN,
      labelScale = 1.0,
      labelBuff = DEFAULT_MOBJECT_TO_MOBJECT_BUFF,
      ...opts
    } = {}
  ) {
    super();
    const target = Array.isArray(obj) ? new VGroup(...obj) : obj;
    this.brace = new Brace(target, { direction: braceDirection, ...opts });
    this.label = this.makeLabel(text, opts).scale(labelScale);
    this.brace.putAtTip(this.label, { buff: labelBuff });
    this.add(this.brace, this.label);
  }

  makeLabel(text, opts) {
    return new Tex(text, opts);
  }
}

export class BraceText extends BraceLabel {
  makeLabel(text, opts) {
    return new Text(text, opts);
  }
}
