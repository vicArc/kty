// Indication animations — port of manimlib/animation/indication.py. Draws the
// viewer's eye to a mobject (or point). FlashAround/FlashUnder use a passing
// flash on a surrounding rectangle/underline; VShowPassingFlash sweeps a
// gaussian-tapered band of per-vertex stroke width along the path.

import { Animation } from './animation.js';
import { Transform } from './transform.js';
import { AnimationGroup, Succession } from './composition.js';
import { ShowPartial, ShowCreation } from './creation.js';
import { FadeOut } from './fading.js';
import { Homotopy } from './movement.js';
import { Circle, Dot, Line } from '../mobject/geometry.js';
import { SurroundingRectangle, Underline } from '../mobject/shape_matchers.js';
import { VMobject, VGroup } from '../mobject/vmobject.js';
import { interpolate } from '../foundation/bezier.js';
import { thereAndBack, wiggle } from '../foundation/rate_functions.js';
import {
  YELLOW,
  GREY,
  TAU,
  OUT,
  UP,
  ORIGIN,
  DEGREES,
  SMALL_BUFF,
  FRAME_X_RADIUS,
  FRAME_Y_RADIUS,
} from '../foundation/constants.js';

const pointOf = (p) => (p instanceof VMobject || (p && p.getCenter) ? p.getCenter() : p);

/** Briefly scale up and recolor a mobject, then return it (there-and-back). */
export class Indicate extends Transform {
  constructor(
    mobject,
    { scaleFactor = 1.2, color = YELLOW, rateFunc = thereAndBack, ...opts } = {}
  ) {
    super(mobject, null, { rateFunc, ...opts });
    this.scaleFactor = scaleFactor;
    this.indicateColor = color;
  }

  createTarget() {
    return this.mobject.copy().scale(this.scaleFactor).setColor(this.indicateColor);
  }
}

/** A translucent disc collapsing onto a point — draws focus there. */
export class FocusOn extends Transform {
  constructor(
    focusPoint,
    { opacity = 0.2, color = GREY, runTime = 2, remover = true, ...opts } = {}
  ) {
    super(new VMobject(), null, { runTime, remover, ...opts });
    this.focusPoint = focusPoint;
    this.focusOpacity = opacity;
    this.focusColor = color;
  }

  createTarget() {
    const dot = new Dot({ radius: 0, fillColor: this.focusColor, fillOpacity: this.focusOpacity });
    return dot.moveTo(pointOf(this.focusPoint));
  }

  createStartingMobject() {
    return new Dot({
      radius: FRAME_X_RADIUS + FRAME_Y_RADIUS,
      strokeWidth: 0,
      fillColor: this.focusColor,
      fillOpacity: 0,
    });
  }
}

/** Flash a circle outline around a mobject (there-and-back, then removed). */
export class CircleIndicate extends Transform {
  constructor(
    mobject,
    {
      scaleFactor = 1.2,
      rateFunc = thereAndBack,
      strokeColor = YELLOW,
      strokeWidth = 3,
      remover = true,
      buff = SMALL_BUFF,
      ...opts
    } = {}
  ) {
    const radius = 0.5 * Math.hypot(mobject.getWidth(), mobject.getHeight()) + buff;
    const circle = new Circle({ radius, strokeColor, strokeWidth }).moveTo(mobject.getCenter());
    const preCircle = circle
      .copy()
      .setStroke(strokeColor, 0)
      .scale(1 / scaleFactor);
    super(preCircle, circle, { rateFunc, remover, ...opts });
  }
}

/** Reveal a moving window of a mobject's stroke (a passing flash). */
export class ShowPassingFlash extends ShowPartial {
  constructor(mobject, { timeWidth = 0.1, remover = true, ...opts } = {}) {
    super(mobject, { remover, ...opts });
    this.timeWidth = timeWidth;
  }

  getBounds(alpha) {
    const tw = this.timeWidth;
    const upper = Math.min(interpolate(0, 1 + tw, alpha), 1);
    const lower = Math.max(interpolate(0, 1 + tw, alpha) - tw, 0);
    return [lower, upper];
  }

  finish() {
    super.finish();
    for (const [submob, start] of this.getAllFamiliesZipped()) {
      submob.pointwiseBecomePartial(start, 0, 1);
    }
  }
}

/**
 * Sweep a gaussian-tapered band of stroke width along a VMobject — a glowing
 * pulse that travels the path. Unlike ShowPassingFlash (which reveals a window
 * of the geometry), this keeps the full geometry and modulates per-vertex
 * stroke width, so the lit band fades smoothly at both ends.
 */
export class VShowPassingFlash extends Animation {
  constructor(vmobject, { timeWidth = 0.3, taperWidth = 0.02, remover = true, ...opts } = {}) {
    super(vmobject, { remover, ...opts });
    this.timeWidth = timeWidth;
    this.taperWidth = taperWidth;
  }

  begin() {
    this.flashFamily = this.mobject.familyMembersWithPoints();
    this.originalWidths = this.flashFamily.map((sm) => Array.from(sm.data.get('stroke_width')));
    super.begin();
  }

  // Per-vertex width = original * gaussian falloff outside the moving window.
  applyBand(alpha) {
    const tw = this.timeWidth;
    const center = interpolate(-tw / 2, 1 + tw / 2, alpha); // band sweeps fully across
    this.flashFamily.forEach((sm, idx) => {
      const orig = this.originalWidths[idx];
      const n = orig.length;
      const arr = sm.data.get('stroke_width');
      for (let i = 0; i < n; i++) {
        const p = n > 1 ? i / (n - 1) : 0;
        const edge = Math.max(0, Math.abs(p - center) - tw / 2);
        arr[i] = orig[i] * Math.exp(-(edge * edge) / this.taperWidth);
      }
      sm.noteChangedData(false);
    });
  }

  interpolate(alpha) {
    this.applyBand(this.timeSpannedAlpha(alpha));
    return this;
  }

  finish() {
    this.mobject.setAnimatingStatus(false);
    if (this.suspendMobjectUpdating) this.mobject.resumeUpdating();
    // Restore the original per-vertex widths.
    this.flashFamily.forEach((sm, idx) => {
      const arr = sm.data.get('stroke_width');
      for (let i = 0; i < arr.length; i++) arr[i] = this.originalWidths[idx][i];
      sm.noteChangedData(false);
    });
    return this;
  }
}

export class ShowCreationThenDestruction extends ShowPassingFlash {
  constructor(mobject, { timeWidth = 2.0, ...opts } = {}) {
    super(mobject, { timeWidth, ...opts });
  }
}

export class ShowCreationThenFadeOut extends Succession {
  constructor(mobject, { remover = true, ...opts } = {}) {
    super(new ShowCreation(mobject), new FadeOut(mobject), { remover, ...opts });
  }
}

/** Lines radiating outward from a point — a "ping". */
export class Flash extends AnimationGroup {
  constructor(
    point,
    {
      color = YELLOW,
      lineLength = 0.2,
      numLines = 12,
      flashRadius = 0.3,
      lineStrokeWidth = 3.0,
      runTime = 1.0,
      ...opts
    } = {}
  ) {
    const lines = new VGroup();
    for (let i = 0; i < numLines; i++) {
      const line = new Line({ start: ORIGIN, end: [lineLength, 0, 0] });
      line.shift([flashRadius - lineLength, 0, 0]);
      line.rotate((TAU * i) / numLines, OUT, { aboutPoint: ORIGIN });
      lines.add(line);
    }
    lines.setStroke(color, lineStrokeWidth);
    lines.shift(pointOf(point));
    super(
      lines.submobjects.map((l) => new ShowCreationThenDestruction(l)),
      { runTime, ...opts }
    );
    this.lines = lines;
  }
}

/** Wobble a mobject in place (scale up/down while rotating back and forth). */
export class WiggleOutThenIn extends Animation {
  constructor(
    mobject,
    {
      scaleValue = 1.1,
      rotationAngle = 0.01 * TAU,
      nWiggles = 6,
      scaleAboutPoint = null,
      rotateAboutPoint = null,
      runTime = 2,
      ...opts
    } = {}
  ) {
    super(mobject, { runTime, ...opts });
    this.scaleValue = scaleValue;
    this.rotationAngle = rotationAngle;
    this.nWiggles = nWiggles;
    this.scaleAboutPoint = scaleAboutPoint;
    this.rotateAboutPoint = rotateAboutPoint;
  }

  interpolateSubmobject(submob, start, alpha) {
    if (!submob.matchPoints) return;
    submob.matchPoints(start);
    submob.scale(interpolate(1, this.scaleValue, thereAndBack(alpha)), {
      aboutPoint: this.scaleAboutPoint ?? this.mobject.getCenter(),
    });
    submob.rotate(wiggle(alpha, this.nWiggles) * this.rotationAngle, OUT, {
      aboutPoint: this.rotateAboutPoint ?? this.mobject.getCenter(),
    });
  }
}

/** A wave that travels across a mobject (manim's ApplyWave). */
export class ApplyWave extends Homotopy {
  constructor(mobject, { direction = UP, amplitude = 0.2, runTime = 1.0, ...opts } = {}) {
    const leftX = mobject.getBoundingBoxPoint([-1, 0, 0])[0];
    const rightX = mobject.getBoundingBoxPoint([1, 0, 0])[0];
    const span = rightX - leftX || 1;
    const vect = direction.map((c) => amplitude * c);
    const homotopy = (x, y, z, t) => {
      const alpha = (x - leftX) / span;
      const power = Math.exp(2 * (alpha - 0.5));
      const nudge = thereAndBack(Math.pow(t, power));
      return [x + nudge * vect[0], y + nudge * vect[1], z + nudge * vect[2]];
    };
    super(homotopy, mobject, { runTime, ...opts });
  }
}

/** Turn a mobject inside out by reversing its winding (manim's TurnInsideOut). */
export class TurnInsideOut extends Transform {
  constructor(mobject, { pathArc = 90 * DEGREES, ...opts } = {}) {
    super(mobject, null, { pathArc, ...opts });
  }

  createTarget() {
    const target = this.mobject.copy();
    for (const sm of target.getFamily()) if (sm.reversePoints) sm.reversePoints();
    return target;
  }
}

/** A flash travelling around a mobject's surrounding rectangle. */
export class FlashAround extends ShowPassingFlash {
  constructor(
    mobject,
    { buff = SMALL_BUFF, color = YELLOW, strokeWidth = 4, timeWidth = 1.0, ...opts } = {}
  ) {
    super(new SurroundingRectangle(mobject, { buff, color, strokeWidth }), { timeWidth, ...opts });
  }
}

/** A flash travelling along an underline beneath a mobject. */
export class FlashUnder extends ShowPassingFlash {
  constructor(
    mobject,
    { buff = SMALL_BUFF, color = YELLOW, strokeWidth = 4, timeWidth = 1.0, ...opts } = {}
  ) {
    super(new Underline(mobject, { buff, strokeColor: color, strokeWidth }), {
      timeWidth,
      ...opts,
    });
  }
}

/** Draw, then erase, a rectangle around a mobject. */
export class ShowCreationThenDestructionAround extends ShowCreationThenDestruction {
  constructor(mobject, { buff = SMALL_BUFF, color = YELLOW, strokeWidth = 2, ...opts } = {}) {
    super(new SurroundingRectangle(mobject, { buff, color, strokeWidth }), opts);
  }
}

/** Draw a rectangle around a mobject, then fade it out. */
export class ShowCreationThenFadeAround extends ShowCreationThenFadeOut {
  constructor(mobject, { buff = SMALL_BUFF, color = YELLOW, strokeWidth = 2, ...opts } = {}) {
    super(new SurroundingRectangle(mobject, { buff, color, strokeWidth }), opts);
  }
}
