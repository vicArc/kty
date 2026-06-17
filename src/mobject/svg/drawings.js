// Small drawn figures — port of the asset-free shapes in
// manimlib/mobject/svg/drawings.py. manim's Checkmark/Exmark use the LaTeX
// pifont \ding glyphs (unavailable in MathJax), so they're drawn here as stroke
// paths. SVG-asset props (Lightbulb, VideoIcon, VectorizedEarth, Piano) and the
// highly 3b1b-specific ones (Speedometer, Laptop) are out of scope.

import { VMobject, VGroup } from '../vmobject.js';
import { Circle, Square, Dot, Line, AnnularSector } from '../geometry.js';
import { AnimationGroup } from '../../animation/composition.js';
import { Rotating } from '../../animation/rotation.js';
import { linear } from '../../foundation/rate_functions.js';
import {
  ORIGIN,
  LEFT,
  RIGHT,
  UL,
  UR,
  DL,
  DR,
  WHITE,
  GREEN,
  RED,
  TAU,
  PI,
} from '../../foundation/constants.js';

// manim palette shades not in kty's base set.
const GREY_B = '#BBBBBB';
const GREY_E = '#222222';
const GREEN_E = '#699C52';
const RED_E = '#CF5044';

/** A drawn check mark (✓). */
export class Checkmark extends VMobject {
  constructor({ color = GREEN, strokeWidth = 8, ...style } = {}) {
    super({ strokeColor: color, strokeWidth, ...style });
    this.setPointsAsCorners([
      [-0.36, 0.04, 0],
      [-0.07, -0.3, 0],
      [0.43, 0.42, 0],
    ]);
  }
}

/** A drawn cross mark (✗). */
export class Exmark extends VMobject {
  constructor({ color = RED, strokeWidth = 8, ...style } = {}) {
    super({ strokeColor: color, strokeWidth, ...style });
    this.startNewPath([-0.3, 0.3, 0]);
    this.addLineTo([0.3, -0.3, 0]);
    this.startNewPath([-0.3, -0.3, 0]);
    this.addLineTo([0.3, 0.3, 0]);
  }
}

/** A clock face with hour/minute hands and twelve ticks. */
export class Clock extends VGroup {
  constructor({
    strokeColor = WHITE,
    strokeWidth = 3.0,
    hourHandHeight = 0.3,
    minuteHandHeight = 0.6,
    tickLength = 0.1,
  } = {}) {
    super();
    const style = { strokeColor, strokeWidth };
    const circle = new Circle(style);
    this.ticks = new VGroup();
    for (let x = 0; x < 12; x++) {
      const angle = (x * TAU) / 12;
      const point = [Math.sin(angle), Math.cos(angle), 0]; // cos·UP + sin·RIGHT
      const length = x % 3 === 0 ? tickLength * 2 : tickLength;
      this.ticks.add(new Line({ start: point, end: point.map((c) => (1 - length) * c), ...style }));
    }
    this.hourHand = new Line({ start: ORIGIN, end: [0, hourHandHeight, 0], ...style });
    this.minuteHand = new Line({ start: ORIGIN, end: [0, minuteHandHeight, 0], ...style });
    this.add(circle, this.hourHand, this.minuteHand, this.ticks);
  }
}

/** Rotate a Clock's hands to advance the given number of hours. */
export class ClockPassesTime extends AnimationGroup {
  constructor(clock, { runTime = 5.0, hoursPassed = 12.0, rateFunc = linear, ...opts } = {}) {
    const aboutPoint = clock.getCenter();
    const hourRadians = (-hoursPassed * 2 * PI) / 12;
    super(
      new Rotating(clock.hourHand, { angle: hourRadians, aboutPoint, runTime, rateFunc }),
      new Rotating(clock.minuteHand, { angle: 12 * hourRadians, aboutPoint, runTime, rateFunc }),
      { runTime, ...opts }
    );
  }
}

/** One face of a six-sided die, showing `value` pips (1–6). */
export class DieFace extends VGroup {
  constructor(
    value,
    {
      sideLength = 1.0,
      cornerRadius = 0.15,
      strokeColor = WHITE,
      strokeWidth = 2.0,
      fillColor = GREY_E,
      dotRadius = 0.08,
      dotColor = WHITE,
      dotCoalesceFactor = 0.5,
    } = {}
  ) {
    super();
    if (!(Number.isInteger(value) && value >= 1 && value <= 6)) {
      throw new Error('DieFace only accepts integers between 1 and 6');
    }
    const square = new Square({
      sideLength,
      strokeColor,
      strokeWidth,
      fillColor,
      fillOpacity: 1.0,
    });
    square.roundCorners(cornerRadius);

    const edgeGroup = [
      [ORIGIN],
      [UL, DR],
      [UL, ORIGIN, DR],
      [UL, UR, DL, DR],
      [UL, UR, ORIGIN, DL, DR],
      [UL, UR, LEFT, RIGHT, DL, DR],
    ][value - 1];

    const dots = new VGroup(
      ...edgeGroup.map((vect) =>
        new Dot({ radius: dotRadius, fillColor: dotColor }).moveTo(square.getBoundingBoxPoint(vect))
      )
    );
    // Pull the pips inward from the edges (manim's space_out_submobjects).
    const c = dots.getCenter();
    for (const d of dots.submobjects) {
      const dc = d.getCenter();
      d.shift([
        (c[0] - dc[0]) * (1 - dotCoalesceFactor),
        (c[1] - dc[1]) * (1 - dotCoalesceFactor),
        0,
      ]);
    }

    this.add(square, dots);
    this.dots = dots;
    this.value = value;
    this.index = value;
  }
}

/** A standard dartboard — concentric scoring rings with a bullseye. */
export class Dartboard extends VGroup {
  constructor({ radius = 3, nSectors = 20 } = {}) {
    super();
    const angle = TAU / nSectors;
    const bands = [
      [[GREY_B, GREY_E], 0, 1],
      [[GREEN_E, RED_E], 0.5, 0.55],
      [[GREEN_E, RED_E], 0.95, 1],
    ];
    const segments = new VGroup();
    for (const [colors, inR, outR] of bands) {
      const ring = new VGroup();
      for (let n = 0; n < nSectors; n++) {
        ring.add(
          new AnnularSector({
            innerRadius: inR,
            outerRadius: outR,
            startAngle: n * angle,
            angle,
            fillColor: colors[n % colors.length],
          })
        );
      }
      segments.add(ring);
    }
    segments.rotate(-angle / 2);

    const bullseyes = new VGroup(...[0.07, 0.035].map((r) => new Circle({ radius: r })));
    bullseyes.setFill(null, 1).setStroke(null, 0);
    bullseyes.submobjects[0].setColor(GREEN_E);
    bullseyes.submobjects[1].setColor(RED_E);

    this.bullseye = bullseyes.submobjects[1];
    this.add(...segments.submobjects, ...bullseyes.submobjects);
    this.scale(radius);
  }
}
