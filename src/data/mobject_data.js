// SoA column store backing every Mobject — the web replacement for manim's
// numpy structured `Mobject.data` array (docs/01). Each named column is its
// own Float32Array (itemSize floats per vertex), mapping 1:1 to a
// THREE.BufferAttribute later. A 1-row `defaults` per column preserves style
// across resize-to-zero, exactly like manim's `_data_defaults`.

import {
  resizeArrayTyped,
  resizePreservingOrderTyped,
  resizeWithInterpolationTyped,
} from '../foundation/arrays.js';

const RESIZE = {
  tile: resizeArrayTyped,
  order: resizePreservingOrderTyped,
  interp: resizeWithInterpolationTyped,
};

/** Default schema for a generic Mobject: a 3D point and an RGBA color. */
export const DEFAULT_SCHEMA = [
  ['point', 3],
  ['rgba', 4],
];

export class MobjectData {
  /** @param {[string, number][]} schema column name + itemSize pairs */
  constructor(schema = DEFAULT_SCHEMA) {
    this.length = 0;
    this.columns = new Map();
    this.defaults = new Map();
    for (const [name, itemSize] of schema) {
      this.columns.set(name, { data: new Float32Array(0), itemSize });
      // manim's _data_defaults = np.ones(1, dtype) → every field defaults to 1.
      this.defaults.set(name, new Float32Array(itemSize).fill(1));
    }
  }

  /** The flat Float32Array for a column. */
  get(name) {
    return this.columns.get(name).data;
  }

  itemSize(name) {
    return this.columns.get(name).itemSize;
  }

  /** Copy of row i of a column as a plain number[]. */
  getRow(name, i) {
    const { data, itemSize } = this.columns.get(name);
    return Array.from(data.subarray(i * itemSize, i * itemSize + itemSize));
  }

  /** The 1-row default for a column (number[]) — used when there are no points. */
  defaultRow(name) {
    return Array.from(this.defaults.get(name));
  }

  setDefaultRow(name, values) {
    this.defaults.get(name).set(values);
  }

  /**
   * Resize all columns to `length` rows.
   * @param {number} newLength
   * @param {'tile'|'order'|'interp'} mode resize strategy (manim's resize_func)
   */
  resize(newLength, mode = 'tile') {
    if (newLength === this.length) return this;
    const resizeFn = RESIZE[mode];

    if (newLength === 0) {
      if (this.length > 0) {
        for (const [name, col] of this.columns) {
          this.defaults.get(name).set(col.data.subarray(0, col.itemSize));
        }
      }
      for (const col of this.columns.values()) col.data = new Float32Array(0);
      this.length = 0;
      return this;
    }

    if (this.length === 0) {
      // Start from a single default row, then resize up.
      for (const [name, col] of this.columns) {
        col.data = new Float32Array(this.defaults.get(name));
      }
      this.length = 1;
    }

    for (const col of this.columns.values()) {
      col.data = resizeFn(col.data, newLength, col.itemSize);
    }
    this.length = newLength;
    return this;
  }

  /** Overwrite a whole column (length*itemSize floats). */
  setColumn(name, values) {
    this.columns.get(name).data.set(values);
    return this;
  }

  /** Set one row of a column. */
  setRow(name, i, values) {
    const { data, itemSize } = this.columns.get(name);
    data.set(values, i * itemSize);
    return this;
  }

  /** Deep copy. */
  clone() {
    const c = Object.create(MobjectData.prototype);
    c.length = this.length;
    c.columns = new Map();
    for (const [name, col] of this.columns) {
      c.columns.set(name, { data: new Float32Array(col.data), itemSize: col.itemSize });
    }
    c.defaults = new Map();
    for (const [name, d] of this.defaults) c.defaults.set(name, new Float32Array(d));
    return c;
  }
}
