// Port of the orchestration core of manimlib/scene/scene.py: the mobject list
// plus the async play/wait driver (docs/01). Time advances frame-by-frame; a
// subclass overrides `tick()` to drive rendering (requestAnimationFrame in the
// browser). In Node/tests `tick` resolves immediately, so play() runs
// synchronously to completion and leaves mobjects in their final state.

import { prepareAnimation } from '../animation/animation.js';
import { assembleRenderGroups } from '../render/render_backend.js';

export class Scene {
  constructor({ fps = 30 } = {}) {
    this.mobjects = [];
    this.fps = fps;
    this.time = 0;
    this.numPlays = 0;
    this.skipAnimations = false;
  }

  add(...mobjects) {
    for (const mob of mobjects) {
      if (!this.mobjects.includes(mob)) this.mobjects.push(mob);
    }
    return this;
  }

  remove(...mobjects) {
    this.mobjects = this.mobjects.filter((m) => !mobjects.includes(m));
    return this;
  }

  clear() {
    this.mobjects = [];
    return this;
  }

  getMobjects() {
    return [...this.mobjects];
  }

  /** Render-ordered family members with points (for a renderer to draw). */
  getRenderGroups() {
    return assembleRenderGroups(this.mobjects);
  }

  async play(...animations) {
    const anims = animations.map(prepareAnimation);
    if (anims.length === 0) return this;
    for (const anim of anims) {
      this.add(anim.mobject);
      anim.begin();
    }
    const runTime = Math.max(...anims.map((a) => a.getRunTime()));
    await this.progress(runTime, (alpha) => {
      for (const anim of anims) anim.interpolate(alpha);
    });
    for (const anim of anims) {
      anim.finish();
      anim.cleanUpFromScene(this);
    }
    this.numPlays += 1;
    return this;
  }

  async wait(duration = 1.0) {
    await this.progress(duration, () => {});
    return this;
  }

  /** Step `runTime` seconds in 1/fps increments, applying `onAlpha` each frame. */
  async progress(runTime, onAlpha) {
    const nFrames = Math.max(1, Math.ceil(runTime * this.fps));
    const dt = runTime / nFrames;
    for (let f = 1; f <= nFrames; f++) {
      const alpha = Math.min(f / nFrames, 1);
      onAlpha(alpha);
      this.time += dt;
      this.updateMobjects(dt);
      await this.tick(dt);
    }
  }

  updateMobjects(dt) {
    for (const mob of this.mobjects) mob.update(dt);
  }

  /** Override in a browser scene to await a frame and render. */
  async tick(_dt) {
    // No-op in headless mode.
  }

  // Simple undo support (manim's get_state/restore_state).
  getState() {
    return this.mobjects.map((m) => [m, m.copy()]);
  }

  restoreState(state) {
    this.mobjects = state.map(([m]) => m);
    for (const [m, saved] of state) m.become(saved);
    return this;
  }
}
