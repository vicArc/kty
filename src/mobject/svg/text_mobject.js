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

export function escapeLatex(s) {
  return String(s).replace(/[&%$#_{}~^\\]/g, (c) => LATEX_ESCAPES[c]);
}

export class Text extends Tex {
  constructor(text, opts = {}) {
    super(`\\text{${escapeLatex(text)}}`, opts);
    this.text = text;
  }
}
