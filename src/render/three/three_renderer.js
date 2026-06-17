// ThreeRenderer — the WebGL2 implementation of RenderBackend (docs/02).
// Building scenes/objects needs no GL context (unit-testable in Node); only
// attach()/render() touch WebGL and therefore require a browser canvas.

import * as THREE from 'three';
import { RenderBackend, assembleRenderGroups } from '../render_backend.js';
import { buildVMobjectObject3D } from './vmobject_geometry.js';
import { buildSurfaceObject3D } from './surface_geometry.js';
import { buildPointsObject3D } from './points_geometry.js';
import { buildImageObject3D } from './image_geometry.js';
import { Camera } from '../../camera/camera.js';

export class ThreeRenderer extends RenderBackend {
  constructor({
    width = 1920,
    height = 1080,
    camera = new Camera(),
    preserveDrawingBuffer = false,
  } = {}) {
    super();
    this.width = width;
    this.height = height;
    this.camera = camera;
    this.preserveDrawingBuffer = preserveDrawingBuffer;
    this.scene = new THREE.Scene();
    // Parse as sRGB so the background matches the configured hex (see vmobject_geometry).
    this.scene.background = new THREE.Color(camera.backgroundColor);
    this.threeCamera = camera.makeThreeCamera();
    this.renderer = null; // created on attach() (needs a canvas/GL context)
    // Cache of built Object3Ds keyed by mobject, so a per-frame re-render only
    // rebuilds geometry for mobjects whose data actually changed (the
    // _dataHasChanged gate). Without this, static scenes re-triangulate every
    // frame and heavy ones exhaust memory faster than GC reclaims it.
    this._renderCache = new Map();
  }

  /** Free a built Object3D's GPU resources (geometries + materials, not shared textures). */
  _disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
  }

  get resolution() {
    return [this.width, this.height];
  }

  /** Build the Three object graph for a Mobject, dispatched by render type. */
  buildMobject(mob) {
    switch (mob.renderType) {
      case 'surface':
        return buildSurfaceObject3D(mob);
      case 'points':
        return buildPointsObject3D(mob);
      case 'image':
        return buildImageObject3D(mob);
      default:
        return buildVMobjectObject3D(mob, this.resolution);
    }
  }

  /** Rebuild the scene contents from an ordered mobject list. */
  buildScene(mobjects) {
    const members = assembleRenderGroups(mobjects);
    const present = new Set(members);
    // Drop cached objects for mobjects no longer in the scene.
    for (const [mob, obj] of this._renderCache) {
      if (!present.has(mob)) {
        this.scene.remove(obj);
        this._disposeObject(obj);
        this._renderCache.delete(mob);
      }
    }
    // Lights are cheap and depend on the current frame's content; rebuild them.
    for (const child of [...this.scene.children]) {
      if (child.isLight) this.scene.remove(child);
    }

    let order = 0;
    let needsLights = false;
    for (const mob of members) {
      let obj = this._renderCache.get(mob);
      // Rebuild only when the mobject is new or its data changed since last build.
      if (!obj || mob._dataHasChanged) {
        if (obj) {
          this.scene.remove(obj);
          this._disposeObject(obj);
        }
        obj = this.buildMobject(mob);
        this._renderCache.set(mob, obj);
        this.scene.add(obj);
        mob._dataHasChanged = false;
      }
      obj.renderOrder = order++;
      // Surfaces and depth-tested 3D VMobjects (VCube/Dodecahedron) use lit
      // materials; flat 2D VMobject fills ignore lights, so 2D is unaffected.
      if (mob.renderType === 'surface' || mob.depthTest) needsLights = true;
    }
    if (needsLights) this._addLights();
    return this.scene;
  }

  /** Ambient + a camera-ish directional light, enough to read 3D shading. */
  _addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(-1, 1, 2);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(2, -1, 1);
    this.scene.add(fill);
  }

  /**
   * Resize the drawing buffer. With `matchAspect` (default), the camera frame's
   * width is adjusted to the new pixel aspect so content isn't stretched —
   * vertical world extent is preserved. Used by `observeResize`.
   */
  setSize(width, height, { matchAspect = true } = {}) {
    this.width = width;
    this.height = height;
    if (this.renderer) this.renderer.setSize(width, height, false);
    if (matchAspect && height > 0) {
      const frame = this.camera.getFrame();
      frame.setFrameShape(frame.getHeight() * (width / height), frame.getHeight());
    }
    return this;
  }

  /** Attach to a real canvas, creating the WebGL renderer (browser only). */
  attach(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: this.preserveDrawingBuffer,
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(globalThis.devicePixelRatio || 1);
    return this;
  }

  /** Ensure threeCamera matches the frame's current projection (ortho ↔ perspective). */
  _ensureThreeCamera(camera) {
    const wantPerspective = camera.getFrame().isPerspective();
    const isPerspective = this.threeCamera && this.threeCamera.isPerspectiveCamera;
    if (!this.threeCamera || wantPerspective !== isPerspective) {
      this.threeCamera = camera.makeThreeCamera();
    }
  }

  /** Render the current mobjects to the attached canvas. */
  render(mobjects, camera = this.camera) {
    if (!this.renderer) throw new Error('ThreeRenderer.render requires attach(canvas) first');
    this._ensureThreeCamera(camera);
    camera.syncThreeCamera(this.threeCamera);
    this.buildScene(mobjects);
    this.renderer.render(this.scene, this.threeCamera);
    return this;
  }
}
