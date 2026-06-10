// Port of manimlib/mobject/value_tracker.py.
// A non-displayed Mobject whose value can be animated like any other.

import { Mobject } from './mobject.js';

export class ValueTracker extends Mobject {
  constructor(value = 0) {
    super();
    this.setValue(value);
  }

  initUpdaters() {
    super.initUpdaters();
    this._value = Array.isArray(this.value) ? [...this.value] : [0];
  }

  getValue() {
    const v = this._value;
    return v.length === 1 ? v[0] : [...v];
  }

  setValue(value) {
    this._value = Array.isArray(value) ? [...value] : [value];
    return this;
  }

  incrementValue(dValue) {
    return this.setValue(this.getValue() + dValue);
  }
}

export class ExponentialValueTracker extends ValueTracker {
  getValue() {
    return Math.exp(super.getValue());
  }
  setValue(value) {
    return super.setValue(Math.log(value));
  }
}

export class ComplexValueTracker extends ValueTracker {
  setValue(value) {
    const z = typeof value === 'object' ? value : { re: value, im: 0 };
    this._value = [z.re, z.im];
    return this;
  }
  getValue() {
    return { re: this._value[0], im: this._value[1] };
  }
}
