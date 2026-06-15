// Pointer events & picking (Stage 8.1) — the library's thin interaction layer.
// An EventDispatcher attaches to a ThreeRenderer's canvas, raycasts the current
// scene, maps the hit back to its Mobject (via `userData.mobject`), and fires
// the mobject's handlers (click / hover / drag) with leaf→parent bubbling.
// Also: responsive-resize and fullscreen helpers.

import * as THREE from 'three';

/** Walk up the Three object tree to the Mobject a built object belongs to. */
export function findMobject(object) {
  let o = object;
  while (o) {
    if (o.userData && o.userData.mobject) return o.userData.mobject;
    o = o.parent;
  }
  return null;
}

function makePointerEvent(type, data) {
  let stopped = false;
  return {
    type,
    ...data,
    currentMobject: data.mobject,
    stopPropagation() {
      stopped = true;
    },
    get propagationStopped() {
      return stopped;
    },
  };
}

/** Dispatch `type` to `mob` and bubble up its first-parent chain until stopped. */
export function dispatchToMobject(mob, type, data) {
  const evt = makePointerEvent(type, { ...data, mobject: mob });
  let m = mob;
  while (m && !evt.propagationStopped) {
    evt.currentMobject = m;
    for (const fn of m.getEventListeners ? m.getEventListeners(type) : []) {
      fn(evt);
      if (evt.propagationStopped) break;
    }
    m = m.parents && m.parents.length ? m.parents[0] : null;
  }
  return evt;
}

/** True if `mob` or any ancestor listens for `type`. */
function familyHasListener(mob, type) {
  let m = mob;
  while (m) {
    if (m.hasEventListeners && m.hasEventListeners(type)) return true;
    m = m.parents && m.parents.length ? m.parents[0] : null;
  }
  return false;
}

export class EventDispatcher {
  /**
   * @param {ThreeRenderer} renderer
   * @param {{ dragPlane?: THREE.Plane, pointThreshold?: number }} [opts]
   */
  constructor(renderer, { dragPlane = null, pointThreshold = 0.12 } = {}) {
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: pointThreshold };
    this.dragPlane = dragPlane || new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this._enabled = false;
    this._hovered = null;
    this._press = null;
    this._drag = null;

    this._onDown = (e) => this._handlePointerDown(e);
    this._onMove = (e) => this._handlePointerMove(e);
    this._onUp = (e) => this._handlePointerUp(e);
  }

  get canvas() {
    return this.renderer.renderer ? this.renderer.renderer.domElement : null;
  }

  /** Attach DOM listeners. Returns `this`. */
  start() {
    const c = this.canvas;
    if (!c || this._enabled) return this;
    c.addEventListener('pointerdown', this._onDown);
    c.addEventListener('pointermove', this._onMove);
    // up on window so a drag that ends off-canvas still completes.
    window.addEventListener('pointerup', this._onUp);
    this._enabled = true;
    return this;
  }

  /** Detach DOM listeners. */
  stop() {
    const c = this.canvas;
    if (!c || !this._enabled) return this;
    c.removeEventListener('pointerdown', this._onDown);
    c.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this._enabled = false;
    return this;
  }

  _ndc(e) {
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
  }

  /** Raycast the current scene; returns `{ mobject, point, object }` or null. */
  pick(e) {
    if (!this.renderer.scene || !this.renderer.threeCamera) return null;
    this.raycaster.setFromCamera(this._ndc(e), this.renderer.threeCamera);
    const hits = this.raycaster.intersectObjects(this.renderer.scene.children, true);
    for (const h of hits) {
      const mob = findMobject(h.object);
      if (mob) return { mobject: mob, point: h.point.toArray(), object: h.object };
    }
    return null;
  }

  _planePoint(e) {
    this.raycaster.setFromCamera(this._ndc(e), this.renderer.threeCamera);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.dragPlane, target) ? target.toArray() : null;
  }

  _handlePointerDown(e) {
    const hit = this.pick(e);
    this._press = hit;
    if (hit && familyHasListener(hit.mobject, 'drag')) {
      this._drag = { mobject: hit.mobject, last: this._planePoint(e) };
    }
  }

  _handlePointerMove(e) {
    if (this._drag) {
      const now = this._planePoint(e);
      const last = this._drag.last;
      if (now && last) {
        const delta = [now[0] - last[0], now[1] - last[1], now[2] - last[2]];
        dispatchToMobject(this._drag.mobject, 'drag', { point: now, delta, native: e });
        this._drag.last = now;
      }
      return;
    }
    // Hover tracking.
    const hit = this.pick(e);
    const next = hit ? hit.mobject : null;
    if (next !== this._hovered) {
      if (this._hovered) {
        dispatchToMobject(this._hovered, 'hover:leave', { point: null, native: e });
      }
      if (next) {
        dispatchToMobject(next, 'hover:enter', { point: hit.point, native: e });
      }
      this._hovered = next;
    }
  }

  _handlePointerUp(e) {
    if (this._drag) {
      this._drag = null;
      this._press = null;
      return;
    }
    // Click = press and release over the same mobject.
    if (this._press) {
      const hit = this.pick(e);
      if (hit && hit.mobject === this._press.mobject) {
        dispatchToMobject(hit.mobject, 'click', { point: hit.point, native: e });
      }
    }
    this._press = null;
  }
}

/**
 * Keep a renderer sized to an element (defaults to its canvas). The vertical
 * world extent is preserved; the horizontal frame is widened/narrowed to the
 * new pixel aspect. Returns a disposer.
 */
export function observeResize(renderer, element = null, onResize = null) {
  const target = element || (renderer.renderer && renderer.renderer.domElement);
  if (!target || typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (width > 0 && height > 0) {
      renderer.setSize(width, height);
      if (onResize) onResize(width, height);
    }
  });
  ro.observe(target);
  return () => ro.disconnect();
}

/** Toggle fullscreen for an element (defaults to document root). */
export function toggleFullscreen(element = null) {
  const el = element || document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return false;
  }
  el.requestFullscreen?.();
  return true;
}
