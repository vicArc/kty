// SVG path `d`-string parser → subpaths of bezier/line segments.
// Pure string parsing (no DOM), so it runs in Node. Supports the commands
// MathJax and typical icon SVGs emit: M L H V C S Q T Z (absolute + relative).
// Elliptical arcs (A) are not used by glyph outlines and are not handled.

const TOKEN = /[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

/**
 * @returns {Array<{start:[number,number], segments:Array, closed:boolean}>}
 * where each segment is { type:'line'|'quad'|'cubic', points:[[x,y],...] }.
 */
export function parsePathD(d) {
  const tokens = d.match(TOKEN) || [];
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  const isCmd = (t) => /[a-zA-Z]/.test(t);

  const subpaths = [];
  let current = null; // { start, segments, closed }
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let prevCubicCtrl = null; // for S
  let prevQuadCtrl = null; // for T
  let cmd = '';

  const beginSubpath = (x, y) => {
    current = { start: [x, y], segments: [], closed: false };
    subpaths.push(current);
    startX = x;
    startY = y;
  };

  while (i < tokens.length) {
    if (isCmd(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === 'M') {
      let x = num();
      let y = num();
      if (rel) {
        x += cx;
        y += cy;
      }
      cx = x;
      cy = y;
      beginSubpath(x, y);
      cmd = rel ? 'l' : 'L'; // subsequent pairs are implicit line-tos
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'L') {
      let x = num();
      let y = num();
      if (rel) {
        x += cx;
        y += cy;
      }
      current.segments.push({ type: 'line', points: [[x, y]] });
      cx = x;
      cy = y;
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'H') {
      let x = num();
      if (rel) x += cx;
      current.segments.push({ type: 'line', points: [[x, cy]] });
      cx = x;
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'V') {
      let y = num();
      if (rel) y += cy;
      current.segments.push({ type: 'line', points: [[cx, y]] });
      cy = y;
      prevCubicCtrl = prevQuadCtrl = null;
    } else if (C === 'C' || C === 'S') {
      let c1;
      if (C === 'C') {
        c1 = [num(), num()];
        if (rel) c1 = [c1[0] + cx, c1[1] + cy];
      } else {
        c1 = prevCubicCtrl ? [2 * cx - prevCubicCtrl[0], 2 * cy - prevCubicCtrl[1]] : [cx, cy];
      }
      let c2 = [num(), num()];
      let end = [num(), num()];
      if (rel) {
        c2 = [c2[0] + cx, c2[1] + cy];
        end = [end[0] + cx, end[1] + cy];
      }
      current.segments.push({ type: 'cubic', points: [c1, c2, end] });
      prevCubicCtrl = c2;
      prevQuadCtrl = null;
      [cx, cy] = end;
    } else if (C === 'Q' || C === 'T') {
      let ctrl;
      if (C === 'Q') {
        ctrl = [num(), num()];
        if (rel) ctrl = [ctrl[0] + cx, ctrl[1] + cy];
      } else {
        ctrl = prevQuadCtrl ? [2 * cx - prevQuadCtrl[0], 2 * cy - prevQuadCtrl[1]] : [cx, cy];
      }
      let end = [num(), num()];
      if (rel) end = [end[0] + cx, end[1] + cy];
      current.segments.push({ type: 'quad', points: [ctrl, end] });
      prevQuadCtrl = ctrl;
      prevCubicCtrl = null;
      [cx, cy] = end;
    } else if (C === 'Z') {
      if (current) current.closed = true;
      cx = startX;
      cy = startY;
      prevCubicCtrl = prevQuadCtrl = null;
    } else {
      throw new Error(`Unsupported SVG path command: ${cmd}`);
    }
  }
  return subpaths;
}
