// Composite Tex layouts — port of manimlib/mobject/svg/special_tex.py.
// manim renders BulletedList as one LaTeX itemize/enumerate block; MathJax (our
// Tex backend) has no such environments, so each item is composed here as a
// marker (bullet dot or number) plus its text, arranged vertically.

import { VGroup } from '../vmobject.js';
import { TexText } from './tex_mobject.js';
import { Dot, Line } from '../geometry.js';
import {
  UP,
  DOWN,
  LEFT,
  RIGHT,
  WHITE,
  GREY,
  FRAME_WIDTH,
  SMALL_BUFF,
  MED_SMALL_BUFF,
  MED_LARGE_BUFF,
} from '../../foundation/constants.js';

const isOpts = (o) => o && typeof o === 'object' && typeof o.getFamily !== 'function';

/** A vertical list of items, each prefixed with a bullet (or a number). */
export class BulletedList extends VGroup {
  constructor(...args) {
    const opts = args.length && isOpts(args[args.length - 1]) ? args.pop() : {};
    const {
      buff = MED_LARGE_BUFF,
      alignedEdge = LEFT,
      numbered = false,
      color = WHITE,
      ...style
    } = opts;
    const items = args;

    const lines = items.map((item, i) => {
      const text = new TexText(String(item), { color, ...style });
      const marker = numbered
        ? new TexText(`${i + 1}.`, { color, ...style })
        : new Dot({ radius: 0.06, fillColor: color });
      marker.nextTo(text, LEFT, SMALL_BUFF);
      return new VGroup(marker, text);
    });

    super(...lines);
    this.arrange(DOWN, buff);
    // Align every line's chosen edge (left by default) so markers line up.
    for (let i = 1; i < this.submobjects.length; i++) {
      this.submobjects[i].alignTo(this.submobjects[0], alignedEdge);
    }
    this.center();
  }

  /** Highlight one item — others fade and shrink (manim's fade_all_but). */
  fadeAllBut(index, { opacity = 0.25, scaleFactor = 0.7 } = {}) {
    this.submobjects.forEach((line, i) => {
      const focused = i === index;
      line.setFill(null, focused ? 1.0 : opacity);
      line.scale(focused ? 1.0 : scaleFactor, { aboutEdge: LEFT });
    });
    return this;
  }
}

/** Base class for a fixed preset Tex string (subclass sets `tex`). */
export class TexTextFromPresetString extends TexText {
  constructor(opts = {}) {
    const { color, ...rest } = opts;
    super(new.target.tex ?? '', { color: color ?? new.target.defaultColor ?? WHITE, ...rest });
  }
}
TexTextFromPresetString.tex = '';
TexTextFromPresetString.defaultColor = WHITE;

/** A titled heading pinned to the top of the frame, optionally underlined. */
export class Title extends TexText {
  constructor(text, opts = {}) {
    const {
      fontSize = 72,
      includeUnderline = true,
      underlineWidth = FRAME_WIDTH - 2,
      matchUnderlineWidthToText = false,
      underlineBuff = SMALL_BUFF,
      underlineColor = GREY,
      underlineStrokeWidth = 2,
      ...rest
    } = opts;
    super(String(text), { fontSize, ...rest });
    this.toEdge(UP, MED_SMALL_BUFF);
    if (includeUnderline) {
      const underline = new Line({
        start: LEFT,
        end: RIGHT,
        strokeColor: underlineColor,
        strokeWidth: underlineStrokeWidth,
      });
      underline.nextTo(this, DOWN, underlineBuff);
      underline.setWidth(matchUnderlineWidthToText ? this.getWidth() : underlineWidth);
      // Keep it centered under the title after resizing.
      underline.setX(this.getCenter()[0]);
      this.add(underline);
      this.underline = underline;
    }
  }
}
