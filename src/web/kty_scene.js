// <kty-scene> — an embeddable custom element (Stage 9.4). It owns a canvas, a
// ThreeRenderer, an EventDispatcher (picking on by default), a render loop, and
// responsive sizing, so dropping kty into a page is one element + one mount():
//
//   <kty-scene width="640" height="360"></kty-scene>
//   el.mount((kty, { renderer, dispatcher }) => {
//     const c = new kty.Circle({ radius: 2, fillColor: '#58C4DD', fillOpacity: 1 });
//     c.onClick(() => c.setColor('#FC6255'));
//     return [c];                      // or { mobjects, update(dt), reorient: [θ, φ] }
//   });
//
// With no width/height it fills its container and tracks resize.

import { ThreeRenderer } from '../render/three/three_renderer.js';
import { Camera } from '../camera/camera.js';
import { EventDispatcher, observeResize } from '../interaction/events.js';
import * as kty from '../index.js';

/** Normalize a mount() return into { mobjects, update, reorient }. */
export function normalizeSceneResult(out) {
  if (Array.isArray(out)) return { mobjects: out, update: null, reorient: null };
  if (!out) return { mobjects: [], update: null, reorient: null };
  return {
    mobjects: out.mobjects || [],
    update: out.update || null,
    reorient: out.reorient || null,
  };
}

// Extend HTMLElement in the browser; fall back to a plain base in Node so the
// module (and the barrel that re-exports it) can be imported for unit tests.
const ElementBase = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

export class KtyScene extends ElementBase {
  connectedCallback() {
    if (this._renderer) return;
    this.style.display = this.style.display || 'block';

    this._canvas = document.createElement('canvas');
    this._canvas.style.display = 'block';
    this.appendChild(this._canvas);

    const { w, h, responsive } = this._dims();
    const bg = this.getAttribute('background');
    const camera = bg ? new Camera({ backgroundColor: bg }) : new Camera();
    this._renderer = new ThreeRenderer({ width: w, height: h, camera }).attach(this._canvas);
    // Match the camera frame to the canvas aspect so content isn't stretched.
    this._renderer.setSize(w, h);

    if (responsive) {
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      this._unobserve = observeResize(this._renderer, this);
    } else {
      this._canvas.style.width = w + 'px';
      this._canvas.style.height = h + 'px';
    }

    if (this.getAttribute('interactive') !== 'false') {
      this._dispatcher = new EventDispatcher(this._renderer).start();
    }

    if (this._setup) this._apply(this._setup);
    this._start();
  }

  disconnectedCallback() {
    this.pause();
    this._dispatcher?.stop();
    this._unobserve?.();
    this._dispatcher = null;
    this._renderer = null;
    if (this._canvas) this._canvas.remove();
    this._canvas = null;
  }

  /** Provide the scene. `setup(kty, ctx)` returns mobjects or { mobjects, update, reorient }. */
  mount(setup) {
    this._setup = setup;
    if (this._renderer) this._apply(setup);
    return this;
  }

  _apply(setup) {
    const { mobjects, update, reorient } = normalizeSceneResult(
      setup(kty, { renderer: this._renderer, canvas: this._canvas, dispatcher: this._dispatcher })
    );
    this._mobjects = mobjects;
    this._update = update;
    if (reorient) this._renderer.camera.getFrame().reorient(reorient[0], reorient[1], reorient[2]);
  }

  _start() {
    this._running = true;
    this._last = null;
    const loop = (t) => {
      if (!this._running) return;
      const dt = this._last == null ? 0 : (t - this._last) / 1000;
      this._last = t;
      if (this._update) this._update(dt);
      if (this._renderer && this._mobjects) this._renderer.render(this._mobjects);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  pause() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    return this;
  }

  resume() {
    if (!this._running && this._renderer) this._start();
    return this;
  }

  get renderer() {
    return this._renderer;
  }
  get dispatcher() {
    return this._dispatcher;
  }

  _dims() {
    const wAttr = this.getAttribute('width');
    const hAttr = this.getAttribute('height');
    if (wAttr && hAttr) return { w: +wAttr, h: +hAttr, responsive: false };
    const rect = this.getBoundingClientRect();
    return {
      w: Math.max(Math.floor(rect.width), 320),
      h: Math.max(Math.floor(rect.height), 180),
      responsive: true,
    };
  }
}

/** Register the <kty-scene> element (idempotent). Auto-called on import in a browser. */
export function defineKtyScene(tag = 'kty-scene') {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, KtyScene);
  }
}

defineKtyScene();
