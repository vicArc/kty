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

  /** Create an orthographic Three camera sized to the frame. */
  makeThreeCamera() {
    const cam = new THREE.OrthographicCamera();
    cam.near = -100;
    cam.far = 100;
    this.syncThreeCamera(cam);
    return cam;
  }

  /** Update a Three camera's bounds/position from the current frame. */
  syncThreeCamera(cam) {
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
}
