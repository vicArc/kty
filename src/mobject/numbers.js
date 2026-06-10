// Port of manimlib/mobject/numbers.py, rendered via the Tex pipeline (MathJax)
// instead of per-character Text mobjects. setValue rebuilds the glyphs.

import { VGroup } from './vmobject.js';
import { Tex } from './svg/tex_mobject.js';
import { WHITE } from '../foundation/constants.js';

function groupCommas(numStr) {
  const neg = numStr.startsWith('-') || numStr.startsWith('+');
  const sign = neg ? numStr[0] : '';
  const rest = neg ? numStr.slice(1) : numStr;
  const [intPart, fracPart] = rest.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + grouped + (fracPart !== undefined ? '.' + fracPart : '');
}

export class DecimalNumber extends VGroup {
  constructor(
    number = 0,
    {
      numDecimalPlaces = 2,
      includeSign = false,
      groupWithCommas = true,
      fontSize = 48,
      color = WHITE,
      ...style
    } = {}
  ) {
    super();
    this.numDecimalPlaces = numDecimalPlaces;
    this.includeSign = includeSign;
    this.groupWithCommas = groupWithCommas;
    this.fontSize = fontSize;
    this._color = color;
    this._style = style;
    this.setValue(number);
  }

  getNumString(number) {
    let s =
      this.numDecimalPlaces === 0
        ? String(Math.round(number))
        : Number(number).toFixed(this.numDecimalPlaces);
    if (this.includeSign && number >= 0 && !s.startsWith('+')) s = '+' + s;
    if (this.groupWithCommas) s = groupCommas(s);
    return s;
  }

  // Render in math mode; brace the comma so LaTeX doesn't add punctuation spacing.
  _texString(number) {
    return this.getNumString(number).replace(/,/g, '{,}');
  }

  setValue(number) {
    this.number = number;
    const center = this.submobjects.length ? this.getCenter() : null;
    this.setSubmobjects([]);
    const tex = new Tex(this._texString(number), {
      fontSize: this.fontSize,
      color: this._color,
      ...this._style,
    });
    if (tex.submobjects.length) this.add(...tex.submobjects);
    if (center) this.moveTo(center);
    return this;
  }

  getValue() {
    return this.number;
  }

  incrementValue(d = 1) {
    return this.setValue(this.number + d);
  }
}

export class Integer extends DecimalNumber {
  constructor(number = 0, opts = {}) {
    super(number, { numDecimalPlaces: 0, ...opts });
  }
  getValue() {
    return Math.round(this.number);
  }
}
