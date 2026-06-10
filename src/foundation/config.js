// Web replacement for manimlib/config.py + default_config.yml.
// The global mutable addict Dict becomes an immutable default object plus a
// tiny reactive store (no CLI/YAML/filesystem — see docs/03 + docs/05).

import { mergeDictsRecursively } from './dict_ops.js';

/** Defaults ported from default_config.yml (web-relevant subset). */
export const DEFAULT_CONFIG = Object.freeze({
  camera: {
    resolution: [1920, 1080],
    backgroundColor: '#333333',
    fps: 30,
    backgroundOpacity: 1.0,
  },
  scene: {
    defaultWaitTime: 1.0,
    showAnimationProgress: false,
  },
  vmobject: {
    defaultStrokeWidth: 4.0,
    defaultStrokeColor: '#DDDDDD',
    defaultFillColor: '#888888',
  },
  mobject: {
    defaultMobjectColor: '#FFFFFF',
  },
  sizes: {
    frameHeight: 8.0,
    smallBuff: 0.1,
    medSmallBuff: 0.25,
    medLargeBuff: 0.5,
    largeBuff: 1.0,
  },
  text: {
    font: 'Consolas',
    alignment: 'LEFT',
  },
  tex: {
    template: 'default',
  },
  resolutionOptions: {
    low: [854, 480],
    med: [1280, 720],
    high: [1920, 1080],
    '4k': [3840, 2160],
  },
});

/**
 * Minimal reactive config store. Holds a single merged config object and
 * notifies subscribers on change. Replaces manim's global `manim_config`.
 */
export class ConfigStore {
  #config;
  #subscribers = new Set();

  constructor(overrides = {}) {
    this.#config = mergeDictsRecursively(DEFAULT_CONFIG, overrides);
  }

  /** The current merged config (treat as read-only). */
  get() {
    return this.#config;
  }

  /** Deep-merge new overrides and notify subscribers. */
  update(overrides) {
    this.#config = mergeDictsRecursively(this.#config, overrides);
    for (const fn of this.#subscribers) fn(this.#config);
    return this.#config;
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(fn) {
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }
}

/** Process-wide default store, mirroring manim's single global config. */
export const config = new ConfigStore();
