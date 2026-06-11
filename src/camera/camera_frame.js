// Port of the essential CameraFrame behavior from manimlib/camera/camera_frame.py.
// The frame IS a Mobject: moving/scaling it pans and zooms the camera.

import { Mobject } from '../mobject/mobject.js';
import { FRAME_WIDTH, FRAME_HEIGHT, DEGREES } from '../foundation/constants.js';

export class CameraFrame extends Mobject {
  constructor({
    frameShape = [FRAME_WIDTH, FRAME_HEIGHT],
    centerPoint = [0, 0, 0],
    // Vertical field of view, radians (manim's fovy default 45°).
    fovy = 45 * DEGREES,
    // Euler angles (radians) about z (theta), x (phi), z (gamma) — manim's zxz.
    theta = 0,
    phi = 0,
    gamma = 0,
  } = {}) {
    super();
    this._frameShapeInit = frameShape;
    this._centerInit = centerPoint;
    this.fovy = fovy;
    this.theta = theta;
    this.phi = phi;
    this.gamma = gamma;
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

  // --- 3D orientation (perspective) ---

  /** True once the frame is tilted out of the xy-plane (or rolled) → needs perspective. */
  isPerspective() {
    return this.phi !== 0 || this.gamma !== 0;
  }

  /** Set Euler angles directly (radians); null leaves a component unchanged. */
  setEulerAngles({ theta = null, phi = null, gamma = null } = {}) {
    if (theta !== null) this.theta = theta;
    if (phi !== null) this.phi = phi;
    if (gamma !== null) this.gamma = gamma;
    return this;
  }

  /** manim's reorient: angles in degrees, plus optional re-center / re-height. */
  reorient(thetaDeg = null, phiDeg = null, gammaDeg = null, center = null, height = null) {
    if (thetaDeg !== null) this.theta = thetaDeg * DEGREES;
    if (phiDeg !== null) this.phi = phiDeg * DEGREES;
    if (gammaDeg !== null) this.gamma = gammaDeg * DEGREES;
    if (center !== null) this.moveTo(center);
    if (height !== null) this.setFrameShape(this.getWidth(), height);
    return this;
  }

  setFieldOfView(fovy) {
    this.fovy = fovy;
    return this;
  }

  getFieldOfView() {
    return this.fovy;
  }

  /** Distance from frame center to the implied camera eye. */
  getFocalDistance() {
    return (0.5 * this.getHeight()) / Math.tan(0.5 * this.fovy);
  }

  /**
   * Camera basis in world space derived from the zxz Euler angles, matching
   * manim's CameraFrame: `toCamera` points from the center toward the eye,
   * `up` is the camera's up vector. (Columns of Rz(θ)·Rx(φ)·Rz(γ).)
   */
  getCameraBasis() {
    const { theta: t, phi: p, gamma: g } = this;
    const [st, ct] = [Math.sin(t), Math.cos(t)];
    const [sp, cp] = [Math.sin(p), Math.cos(p)];
    const [sg, cg] = [Math.sin(g), Math.cos(g)];
    const toCamera = [st * sp, -ct * sp, cp];
    const up = [-sg * ct - cp * cg * st, -sg * st + cp * cg * ct, sp * cg];
    return { toCamera, up };
  }

  /** World-space position of the camera eye (center + focalDistance · toCamera). */
  getImpliedCameraLocation() {
    const center = this.getCenter();
    const dist = this.getFocalDistance();
    const { toCamera } = this.getCameraBasis();
    return [
      center[0] + dist * toCamera[0],
      center[1] + dist * toCamera[1],
      center[2] + dist * toCamera[2],
    ];
  }
}
