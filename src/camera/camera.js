// Port of the orchestration role of manimlib/camera/camera.py, adapted to a
// Three.OrthographicCamera driven by a CameraFrame (docs/02). The actual GL
// rendering lives in render/three/ThreeRenderer.

import * as THREE from 'three';
import { CameraFrame } from './camera_frame.js';

export class Camera {
  constructor({ frameConfig = {}, backgroundColor = '#333333', backgroundOpacity = 1.0 } = {}) {
    this.frame = new CameraFrame(frameConfig);
    this.backgroundColor = backgroundColor;
    this.backgroundOpacity = backgroundOpacity;
  }

  getFrame() {
    return this.frame;
  }

  /**
   * Create the Three camera matching the frame's current projection: an
   * OrthographicCamera for flat 2D framing, or a PerspectiveCamera once the
   * frame is tilted into 3D (so existing 2D scenes stay orthographic/unchanged).
   */
  makeThreeCamera() {
    const cam = this.frame.isPerspective()
      ? new THREE.PerspectiveCamera()
      : new THREE.OrthographicCamera();
    if (cam.isOrthographicCamera) {
      cam.near = -100;
      cam.far = 100;
    } else {
      cam.near = 0.01;
      cam.far = 1000;
    }
    this.syncThreeCamera(cam);
    return cam;
  }

  /** Update a Three camera's bounds/position from the current frame. */
  syncThreeCamera(cam) {
    return cam.isPerspectiveCamera ? this._syncPerspective(cam) : this._syncOrthographic(cam);
  }

  _syncOrthographic(cam) {
    const [w, h] = this.frame.getFrameShape();
    const [cx, cy] = this.frame.getCenter();
    cam.left = -w / 2;
    cam.right = w / 2;
    cam.top = h / 2;
    cam.bottom = -h / 2;
    cam.position.set(cx, cy, 10);
    cam.lookAt(cx, cy, 0);
    cam.updateProjectionMatrix();
    return cam;
  }

  _syncPerspective(cam) {
    const frame = this.frame;
    const [w, h] = frame.getFrameShape();
    const [cx, cy, cz] = frame.getCenter();
    const eye = frame.getImpliedCameraLocation();
    const { up } = frame.getCameraBasis();
    cam.fov = (frame.getFieldOfView() * 180) / Math.PI;
    cam.aspect = w / h;
    cam.position.set(eye[0], eye[1], eye[2]);
    cam.up.set(up[0], up[1], up[2]);
    cam.lookAt(cx, cy, cz);
    cam.updateProjectionMatrix();
    return cam;
  }
}
