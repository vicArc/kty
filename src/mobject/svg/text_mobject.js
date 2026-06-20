// Text rendered through the Tex pipeline (LaTeX \text{...}). This uses the
// LaTeX text font (Computer Modern); a system-font path via opentype.js glyph
// outlines is a tracked enhancement (manim uses Pango here).

import { Tex } from './tex_mobject.js';

const LATEX_ESCAPES = {
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '\\': '\\textbackslash{}',
};

// Common Unicode → LaTeX. The Computer Modern text font lacks many precomposed
// accented glyphs, so raw "á"/"ñ"/"¿" render as gaps; emit the LaTeX accent /
// punctuation macros (which compose from CM glyphs) instead.
const UNICODE_LATEX = {
  á: "\\'a",
  é: "\\'e",
  í: "\\'i",
  ó: "\\'o",
  ú: "\\'u",
  Á: "\\'A",
  É: "\\'E",
  Í: "\\'I",
  Ó: "\\'O",
  Ú: "\\'U",
  ñ: '\\~n',
  Ñ: '\\~N',
  ü: '\\"u',
  Ü: '\\"U',
  ç: '\\c{c}',
  Ç: '\\c{C}',
  '¿': '\\textquestiondown{}',
  '¡': '\\textexclamdown{}',
  '…': '\\ldots{}',
};

export function escapeLatex(s) {
  // One pass: Unicode macros take precedence, then TeX-special escapes, else
  // the character verbatim.
  return String(s).replace(/[\s\S]/g, (c) => UNICODE_LATEX[c] ?? LATEX_ESCAPES[c] ?? c);
}

export class Text extends Tex {
  constructor(text, opts = {}) {
    super(`\\text{${escapeLatex(text)}}`, opts);
    this.text = text;
  }
}
