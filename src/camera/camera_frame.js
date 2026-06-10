// Port of the essential CameraFrame behavior from manimlib/camera/camera_frame.py.
// The frame IS a Mobject: moving/scaling it pans and zooms the camera.

import { Mobject } from '../mobject/mobject.js';
import { FRAME_WIDTH, FRAME_HEIGHT } from '../foundation/constants.js';

export class CameraFrame extends Mobject {
  constructor({ frameShape = [FRAME_WIDTH, FRAME_HEIGHT], centerPoint = [0, 0, 0] } = {}) {
    super();
    this._frameShapeInit = frameShape;
    this._centerInit = centerPoint;
    // initPoints already ran in super() with defaults; rebuild from args.
    this.setFrameShape(frameShape[0], frameShape[1]);
    this.moveTo(centerPoint);
  }

  initPoints() {
    const [w, h] = [FRAME_WIDTH, FRAME_HEIGHT];
    this._setCorners(w, h);
  }

  _setCorners(w, h) {
    const x = w / 2;
    const y = h / 2;
    this.setPoints([
      [-x, -y, 0],
      [x, -y, 0],
      [x, y, 0],
      [-x, y, 0],
    ]);
  }

  setFrameShape(width, height) {
    const center = this.getCenter();
    this._setCorners(width, height);
    this.moveTo(center);
    return this;
  }

  getFrameShape() {
    return [this.getWidth(), this.getHeight()];
  }

  /** Multiply the frame size by `factor` about its center (zoom; <1 zooms in). */
  setFrameScale(factor) {
    return this.scale(factor);
  }
}
