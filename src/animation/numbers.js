// Port of manimlib/animation/numbers.py — animating DecimalNumber values.

import { Animation } from './animation.js';
import { linear } from '../foundation/rate_functions.js';

export class ChangingDecimal extends Animation {
  constructor(decimalMob, numberUpdateFunc, opts = {}) {
    super(decimalMob, { suspendMobjectUpdating: true, ...opts });
    this.numberUpdateFunc = numberUpdateFunc;
  }
  interpolateMobject(alpha) {
    this.mobject.setValue(this.numberUpdateFunc(this.rateFunc(alpha)));
  }
}

export class ChangeDecimalToValue extends ChangingDecimal {
  constructor(decimalMob, targetValue, opts = {}) {
    const start = decimalMob.getValue();
    super(decimalMob, (a) => start + a * (targetValue - start), opts);
  }
}

export class CountInFrom extends ChangingDecimal {
  constructor(decimalMob, source = 0, opts = {}) {
    const target = decimalMob.getValue();
    super(decimalMob, (a) => source + a * (target - source), { rateFunc: linear, ...opts });
  }
}
