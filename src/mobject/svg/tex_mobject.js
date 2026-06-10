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

/** Convert a LaTeX string into an array of { d, transform } glyph specs. */
export function latexToGlyphs(latex, displayMode = true) {
  const { doc, adaptor } = mathjaxDoc();
  const node = doc.convert(latex, { display: displayMode });
  const glyphs = [];
  collectGlyphs(adaptor, node, IDENTITY_AFFINE, glyphs);
  return glyphs;
}

export class Tex extends VGroup {
  constructor(texString, { fontSize = 48, color = WHITE, fillColor = null, ...style } = {}) {
    super();
    this.texString = texString;
    const glyphs = latexToGlyphs(texString, true);
    for (const g of glyphs) {
      this.add(
        new VMobjectFromSVGPath({
          d: g.d,
          transform: g.transform,
          fillColor: fillColor ?? color,
          fillOpacity: 1.0,
          strokeWidth: 0.0,
          ...style,
        })
      );
    }
    // MathJax path units are ~1000/em with y already flipped up by its inner
    // scale(1,-1); bring to manim world units and center on the origin.
    const scale = (fontSize / 48) * 0.0014;
    if (this.hasPoints() || this.submobjects.length) this.scale(scale);
    this.center();
  }
}

export class TexText extends Tex {
  constructor(text, opts = {}) {
    super(`\\text{${text}}`, opts);
  }
}
