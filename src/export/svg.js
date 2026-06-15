// SVG export (Stage 9.3) — serialize a scene to scalable vector SVG. VMobjects
// become <path> (fill via even-odd so glyph counters stay open; stroke as a
// separate path), DotClouds become <circle>s, ImageMobjects become <image>.
// 3D surfaces aren't vector-exportable and are skipped (use PNG for those).
// Pure string building — no DOM/GL needed, so this runs in Node too.

import { assembleRenderGroups } from '../render/render_backend.js';
import { CameraFrame } from '../camera/camera_frame.js';
import { STROKE_WIDTH_TO_WORLD } from '../render/three/vmobject_geometry.js';
import { rgbToHex } from '../foundation/color.js';

const f = (x) => Number(x.toFixed(4));

/** Build an SVG path `d` from a VMobject's quadratic subpaths (world coords). */
function pathData(mob) {
  let d = '';
  for (const sub of mob.getSubpaths()) {
    if (sub.length < 3) continue;
    d += `M ${f(sub[0][0])} ${f(sub[0][1])}`;
    for (let i = 0; i + 2 < sub.length; i += 2) {
      const h = sub[i + 1];
      const a = sub[i + 2];
      d += ` Q ${f(h[0])} ${f(h[1])} ${f(a[0])} ${f(a[1])}`;
    }
    // Close the subpath if it returns to its start (so strokes have no seam).
    const last = sub[sub.length - 1];
    if (Math.hypot(last[0] - sub[0][0], last[1] - sub[0][1]) < 1e-4) d += ' Z';
    d += ' ';
  }
  return d.trim();
}

function vmobjectToSvg(mob) {
  const d = pathData(mob);
  if (!d) return '';
  const out = [];
  if (mob.getFillOpacity() > 0) {
    out.push(
      `<path d="${d}" fill="${mob.getFillColor()}" fill-opacity="${f(mob.getFillOpacity())}" fill-rule="evenodd"/>`
    );
  }
  if (mob.getStrokeWidth() > 0 && mob.getStrokeOpacity() > 0) {
    const w = f(mob.getStrokeWidth() * STROKE_WIDTH_TO_WORLD);
    out.push(
      `<path d="${d}" fill="none" stroke="${mob.getStrokeColor()}" stroke-width="${w}" ` +
        `stroke-opacity="${f(mob.getStrokeOpacity())}" stroke-linejoin="round" stroke-linecap="round"/>`
    );
  }
  return out.join('\n');
}

function dotCloudToSvg(mob) {
  const n = mob.getNumPoints();
  const pts = mob.getPoints();
  const rgba = mob.data.get('rgba');
  const radii = mob.data.columns.has('radius') ? mob.data.get('radius') : null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = radii ? radii[i] : 0.04;
    const color = rgbToHex([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
    out.push(
      `<circle cx="${f(pts[i][0])}" cy="${f(pts[i][1])}" r="${f(r)}" fill="${color}" fill-opacity="${f(rgba[i * 4 + 3])}"/>`
    );
  }
  return out.join('\n');
}

function imageToSvg(mob) {
  const [ul, , dr] = mob.getPoints();
  const x = ul[0];
  const y = dr[1];
  const w = dr[0] - ul[0];
  const h = ul[1] - dr[1];
  let href = null;
  if (typeof mob.src === 'string') href = mob.src;
  else if (typeof mob.src?.toDataURL === 'function') href = mob.src.toDataURL();
  if (!href) return '';
  // Undo the outer y-flip locally so the bitmap isn't upside down.
  return `<image href="${href}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" transform="translate(0 ${f(2 * y + h)}) scale(1 -1)" preserveAspectRatio="none"/>`;
}

/**
 * Serialize mobjects to an SVG string.
 * @param {Mobject[]} mobjects
 * @param {{ frame?: CameraFrame, camera?: { getFrame(): CameraFrame }, width?: number, height?: number, background?: string }} [opts]
 */
export function toSVG(
  mobjects,
  { frame = null, camera = null, width = 1920, height = 1080, background = null } = {}
) {
  const fr = frame || (camera && camera.getFrame()) || new CameraFrame();
  const [cx, cy] = fr.getCenter();
  const fw = fr.getWidth();
  const fh = fr.getHeight();
  const minX = cx - fw / 2;
  const minY = -(cy + fh / 2); // world is y-up; SVG is y-down

  const body = [];
  for (const mob of assembleRenderGroups(mobjects)) {
    switch (mob.renderType) {
      case 'points':
        body.push(dotCloudToSvg(mob));
        break;
      case 'image':
        body.push(imageToSvg(mob));
        break;
      case 'surface':
        break; // not vector-exportable
      default:
        body.push(vmobjectToSvg(mob));
    }
  }

  const bg = background
    ? `<rect x="${f(minX)}" y="${f(minY)}" width="${f(fw)}" height="${f(fh)}" fill="${background}"/>\n`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(minX)} ${f(minY)} ${f(fw)} ${f(fh)}" ` +
    `width="${width}" height="${height}">\n` +
    bg +
    `<g transform="scale(1 -1)">\n${body.filter(Boolean).join('\n')}\n</g>\n</svg>`
  );
}

/** Trigger a browser download of `mobjects` as an `.svg` file. */
export function downloadSVG(mobjects, filename = 'scene.svg', opts = {}) {
  const blob = new Blob([toSVG(mobjects, opts)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Internal: click a synthetic <a download>. */
export function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
