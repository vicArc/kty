// ThreeRenderer — the WebGL2 implementation of RenderBackend (docs/02).
// Building scenes/objects needs no GL context (unit-testable in Node); only
// attach()/render() touch WebGL and therefore require a browser canvas.

import * as THREE from 'three';
import { RenderBackend, assembleRenderGroups } from '../render_backend.js';
import { buildVMobjectObject3D } from './vmobject_geometry.js';
import { Camera } from '../../camera/camera.js';

export class ThreeRenderer extends RenderBackend {
  constructor({ width = 1920, height = 1080, camera = new Camera() } = {}) {
    super();
    this.width = width;
    this.height = height;
    this.camera = camera;
    this.scene = new THREE.Scene();
    // Parse as sRGB so the background matches the configured hex (see vmobject_geometry).
    this.scene.background = new THREE.Color(camera.backgroundColor);
    this.threeCamera = camera.makeThreeCamera();
    this.renderer = null; // created on attach() (needs a canvas/GL context)
  }

  get resolution() {
    return [this.width, this.height];
  }

  /** Build the Three object graph for a Mobject (VMobjects supported). */
  buildMobject(mob) {
    return buildVMobjectObject3D(mob, this.resolution);
  }

  /** Rebuild the scene contents from an ordered mobject list. */
  buildScene(mobjects) {
    // Clear previous content (keep background).
    for (const child of [...this.scene.children]) this.scene.remove(child);
    let order = 0;
    for (const mob of assembleRenderGroups(mobjects)) {
      const obj = this.buildMobject(mob);
      obj.renderOrder = order++;
      this.scene.add(obj);
    }
    return this.scene;
  }

  /** Attach to a real canvas, creating the WebGL renderer (browser only). */
  attach(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(globalThis.devicePixelRatio || 1);
    return this;
  }

  /** Render the current mobjects to the attached canvas. */
  render(mobjects, camera = this.camera) {
    if (!this.renderer) throw new Error('ThreeRenderer.render requires attach(canvas) first');
    camera.syncThreeCamera(this.threeCamera);
    this.buildScene(mobjects);
    this.renderer.render(this.scene, this.threeCamera);
    return this;
  }
}
