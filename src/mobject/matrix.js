// Matrix (S6.2) — port of matrix.py. A grid of entries (Tex / numbers / any
// mobjects) flanked by brackets. manim builds the brackets from a stretched
// Tex \left[...\right]; kty builds them as hand-made VMobject paths so they stay
// crisp at any height and don't depend on Tex glyph slicing.

import { VMobject, VGroup } from './vmobject.js';
import { Tex } from './svg/tex_mobject.js';
import { DecimalNumber, Integer } from './numbers.js';
import { Mobject } from './mobject.js';
import { DOWN, LEFT, RIGHT, WHITE } from '../foundation/constants.js';

export class Matrix extends VGroup {
  constructor(
    matrix,
    {
      vBuff = 0.6,
      hBuff = 0.7,
      bracketHBuff = 0.2,
      bracketVBuff = 0.25,
      bracketStrokeWidth = 5,
      height = null,
      elementConfig = {},
      elementAlignmentCorner = DOWN,
    } = {}
  ) {
    super();
    this.mobMatrix = matrix.map((row) => row.map((el) => this.elementToMobject(el, elementConfig)));
    const flat = this.mobMatrix.flat();
    const nCols = this.mobMatrix[0].length;

    const maxW = Math.max(...flat.map((m) => m.getWidth()));
    const maxH = Math.max(...flat.map((m) => m.getHeight()));
    const xStep = maxW + hBuff;
    const yStep = maxH + vBuff;
    this.mobMatrix.forEach((row, i) => {
      row.forEach((elem, j) => {
        elem.moveTo([j * xStep, -i * yStep, 0], { alignedEdge: elementAlignmentCorner });
      });
    });

    // Reference groups (not added as submobjects — they share the element mobjects).
    this.elements = flat;
    this.rows = new VGroup(...this.mobMatrix.map((row) => new VGroup(...row)));
    this.columns = new VGroup(
      ...Array.from({ length: nCols }, (_, c) => new VGroup(...this.mobMatrix.map((row) => row[c])))
    );
    if (height != null) this.rows.setHeight(height - 2 * bracketVBuff);

    this.brackets = this.createBrackets(this.rows, bracketVBuff, bracketHBuff, bracketStrokeWidth);
    this.add(...this.elements, ...this.brackets.submobjects);
    this.center();
  }

  elementToMobject(element, config) {
    if (element instanceof Mobject) return element;
    return new Tex(String(element), config);
  }

  createBrackets(rows, vBuff, hBuff, strokeWidth) {
    const h = rows.getHeight() + 2 * vBuff;
    const left = bracketPath(-1, h, strokeWidth).nextTo(rows, LEFT, hBuff);
    const right = bracketPath(1, h, strokeWidth).nextTo(rows, RIGHT, hBuff);
    return new VGroup(left, right);
  }

  getColumns() {
    return this.columns;
  }
  getRows() {
    return this.rows;
  }
  getColumn(i) {
    return this.columns.submobjects[i];
  }
  getRow(i) {
    return this.rows.submobjects[i];
  }
  getEntries() {
    return this.elements;
  }
  getBrackets() {
    return this.brackets;
  }

  setColumnColors(...colors) {
    this.getColumns().submobjects.forEach((col, i) => {
      if (colors[i] != null) col.setColor(colors[i]);
    });
    return this;
  }
}

/** A `[`-shaped (side -1) or `]`-shaped (side +1) stroked bracket of the given height. */
function bracketPath(side, height, strokeWidth) {
  const half = height / 2;
  const w = 0.18;
  let pts = [
    [w, half, 0],
    [0, half, 0],
    [0, -half, 0],
    [w, -half, 0],
  ];
  if (side > 0) pts = pts.map(([x, y, z]) => [-x, y, z]);
  return new VMobject().setPointsAsCorners(pts).setStroke(WHITE, strokeWidth, 1);
}

export class IntegerMatrix extends Matrix {
  elementToMobject(element, config) {
    if (element instanceof Mobject) return element;
    return new Integer(element, config);
  }
}

export class DecimalMatrix extends Matrix {
  elementToMobject(element, config) {
    if (element instanceof Mobject) return element;
    return new DecimalNumber(element, config);
  }
}

/** A matrix of arbitrary mobjects (entries used as-is). */
export class MobjectMatrix extends Matrix {
  elementToMobject(element) {
    return element;
  }
}
