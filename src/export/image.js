// Raster image export (Stage 9.3) — capture a ThreeRenderer's canvas to PNG (or
// any canvas type). Works for any scene, including 3D surfaces and point clouds.
//
// The WebGL drawing buffer is cleared after compositing, so we re-render right
// before reading when `mobjects` are supplied (the buffer is intact within the
// same synchronous turn). To snapshot at an arbitrary time, construct the
// ThreeRenderer with `{ preserveDrawingBuffer: true }`.

import { triggerDownload } from './svg.js';

function canvasOf(renderer) {
  const c = renderer.renderer && renderer.renderer.domElement;
  if (!c) throw new Error('renderer must be attached to a canvas before exporting');
  return c;
}

/** Render (if mobjects given) and return a data URL of the current frame. */
export function toDataURL(renderer, mobjects = null, { type = 'image/png', quality } = {}) {
  if (mobjects) renderer.render(mobjects);
  return canvasOf(renderer).toDataURL(type, quality);
}

/** Render (if mobjects given) and return the current frame as a Blob. */
export function toBlob(renderer, mobjects = null, { type = 'image/png', quality } = {}) {
  if (mobjects) renderer.render(mobjects);
  return new Promise((resolve) => canvasOf(renderer).toBlob(resolve, type, quality));
}

/** Trigger a browser download of the current frame as an image file. */
export function downloadImage(renderer, filename = 'frame.png', mobjects = null, opts = {}) {
  triggerDownload(toDataURL(renderer, mobjects, opts), filename);
}
