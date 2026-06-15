// ImageMobject — port of image_mobject.py, adapted to the web. A textured quad
// whose four corners live in the `point` column; the texture itself is created
// by the renderer's image path (render/three/image_geometry) from `this.src`,
// which may be a URL string, an HTMLImageElement, or an HTMLCanvasElement.
// Kept renderer-agnostic: no THREE import here.

import { Mobject } from './mobject.js';

export const IMAGE_SCHEMA = [['point', 3]];

export class ImageMobject extends Mobject {
  constructor(src, { height = 4.0, width = null } = {}) {
    super({ schema: IMAGE_SCHEMA });
    this.src = src;
    // Aspect: explicit width wins; else infer from the source's pixel size; else square.
    let w = width;
    if (w == null) {
      const iw = src && (src.naturalWidth || src.width);
      const ih = src && (src.naturalHeight || src.height);
      w = iw && ih ? height * (iw / ih) : height;
    }
    this.imageWidth = w;
    this.imageHeight = height;
    this._setCorners(w, height);
  }

  /** Routes to the renderer's textured-quad path. */
  get renderType() {
    return 'image';
  }

  // ImageMobject color is the texture; set_color is a no-op (as in manim).
  initColors() {}
  setColor() {
    return this;
  }

  _setCorners(w, h) {
    const x = w / 2;
    const y = h / 2;
    // UL, UR, DR, DL — the renderer maps these to texture corners.
    this.setPoints([
      [-x, y, 0],
      [x, y, 0],
      [x, -y, 0],
      [-x, -y, 0],
    ]);
  }

  getCorners() {
    return this.getPoints();
  }
}
