// Tex via MathJax (docs/02): LaTeX → MathJax SVG → glyph VMobjects.
// MathJax runs headless through its lite adaptor (no DOM), so this works in
// Node and the browser alike; with fontCache 'none' every glyph is an inline
// <path>, which we walk into VMobjects.

import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

import { VGroup } from '../vmobject.js';
import { VMobjectFromSVGPath, composeAffine, IDENTITY_AFFINE } from './svg_mobject.js';
import { WHITE } from '../../foundation/constants.js';

let _adaptor = null;
let _doc = null;
function mathjaxDoc() {
  if (_doc) return { doc: _doc, adaptor: _adaptor };
  _adaptor = liteAdaptor();
  RegisterHTMLHandler(_adaptor);
  const input = new TeX({ packages: ['base', 'ams', 'newcommand', 'configmacros'] });
  const output = new SVG({ fontCache: 'none' });
  _doc = mathjax.document('', { InputJax: input, OutputJax: output });
  return { doc: _doc, adaptor: _adaptor };
}

function parseTransform(str) {
  let m = IDENTITY_AFFINE;
  if (!str) return m;
  const re = /(\w+)\(([^)]*)\)/g;
  let match;
  while ((match = re.exec(str))) {
    const args = match[2].split(/[\s,]+/).map(Number);
    if (match[1] === 'translate') m = composeAffine(m, [1, 0, 0, 1, args[0] || 0, args[1] || 0]);
    else if (match[1] === 'scale') m = composeAffine(m, [args[0], 0, 0, args[1] ?? args[0], 0, 0]);
    else if (match[1] === 'matrix') m = composeAffine(m, args);
  }
  return m;
}

function collectGlyphs(adaptor, node, tf, glyphs) {
  if (adaptor.kind(node) === '#text') return;
  const tf2 = composeAffine(tf, parseTransform(adaptor.getAttribute(node, 'transform')));
  if (adaptor.kind(node) === 'path') {
    const d = adaptor.getAttribute(node, 'd');
    if (d) glyphs.push({ d, transform: tf2 });
    return;
  }
  for (const child of adaptor.childNodes(node)) collectGlyphs(adaptor, child, tf2, glyphs);
}

// MathJax SVG is laid out for a y-DOWN canvas (its inner scale(1,-1) flips the
// y-up glyph font space to SVG display space). kty's world is y-UP, so we seed
// the walk with a final y-flip to convert back — otherwise glyphs render upside down.
const FLIP_Y = [1, 0, 0, -1, 0, 0];

/** Convert a LaTeX string into an array of { d, transform } glyph specs. */
export function latexToGlyphs(latex, displayMode = true) {
  const { doc, adaptor } = mathjaxDoc();
  const node = doc.convert(latex, { display: displayMode });
  const glyphs = [];
  collectGlyphs(adaptor, node, FLIP_Y, glyphs);
  return glyphs;
}

export class Tex extends VGroup {
  constructor(
    texString,
    { fontSize = 48, color = WHITE, fillColor = null, texToColorMap = null, ...style } = {}
  ) {
    super();
    this.texString = texString;
    const glyphs = latexToGlyphs(texString, true);
    for (const g of glyphs) {
      const glyph = new VMobjectFromSVGPath({
        d: g.d,
        transform: g.transform,
        fillColor: fillColor ?? color,
        fillOpacity: 1.0,
        strokeWidth: 0.0,
        ...style,
      });
      glyph._svgPathD = g.d; // remember the font glyph for substring matching
      this.add(glyph);
    }
    // MathJax path units are ~1000/em with y already flipped up by its inner
    // scale(1,-1); bring to manim world units and center on the origin.
    const scale = (fontSize / 48) * 0.0014;
    if (this.hasPoints() || this.submobjects.length) this.scale(scale);
    this.center();

    if (texToColorMap) this.setColorByTexToColorMap(texToColorMap);
  }

  /**
   * Every contiguous run of glyphs matching `substring` (as VGroups). Matching
   * is by font-glyph path: `substring` is re-rendered and its glyph sequence is
   * found within this Tex — robust for symbols and simple sub-expressions.
   */
  getParts(substring) {
    const subDs = latexToGlyphs(substring, true).map((g) => g.d);
    const fullDs = this.submobjects.map((m) => m._svgPathD);
    const n = subDs.length;
    const out = [];
    if (n === 0) return out;
    for (let i = 0; i + n <= fullDs.length; i++) {
      if (subDs.every((d, j) => d === fullDs[i + j])) {
        out.push(new VGroup(...this.submobjects.slice(i, i + n)));
      }
    }
    return out;
  }

  /** The `index`-th occurrence of `substring` as a glyph VGroup (or null). */
  getPart(substring, index = 0) {
    return this.getParts(substring)[index] ?? null;
  }

  /** Color every occurrence of `substring`. */
  setColorByTex(substring, color) {
    for (const part of this.getParts(substring)) part.setColor(color);
    return this;
  }

  /** Color substrings from a `{ substring: color }` map. */
  setColorByTexToColorMap(map) {
    for (const [substring, color] of Object.entries(map)) this.setColorByTex(substring, color);
    return this;
  }
}

export class TexText extends Tex {
  constructor(text, opts = {}) {
    super(`\\text{${text}}`, opts);
  }
}
