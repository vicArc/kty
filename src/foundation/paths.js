// Port of manimlib/utils/paths.py — how point sets move during a Transform.
// Points are arrays of 3-vectors: number[][].

import { cross, getNorm, normalize } from './space_ops.js';

const STRAIGHT_PATH_THRESHOLD = 0.01;
const OUT = [0, 0, 1];

/** Linear interpolation between two point sets. */
export function straightPath(startPoints, endPoints, alpha) {
  return startPoints.map((p, i) => p.map((c, j) => (1 - alpha) * c + alpha * endPoints[i][j]));
}

/**
 * Returns a path function moving points along a circular arc of `arcAngle`
 * (scalar) about `axis`. Falls back to a straight path for tiny angles.
 */
export function pathAlongArc(arcAngle, axis = OUT) {
  if (typeof arcAngle === 'number' && Math.abs(arcAngle) < STRAIGHT_PATH_THRESHOLD) {
    return straightPath;
  }
  const unitAxis = getNorm(axis) === 0 ? OUT : normalize(axis);
  const theta = arcAngle;
  const tanHalf = Math.tan(theta / 2);

  return (startPoints, endPoints, alpha) => {
    const cosT = Math.cos(alpha * theta);
    const sinT = Math.sin(alpha * theta);
    return startPoints.map((s, i) => {
      const e = endPoints[i];
      const startToEnd = e.map((c, j) => c - s[j]);
      const half = startToEnd.map((c) => 0.5 * c);
      const adj = cross(
        unitAxis,
        startToEnd.map((c) => c / 2)
      ).map((c) => c / tanHalf);
      const center = s.map((c, j) => c + half[j] + adj[j]);
      const cToStart = s.map((c, j) => c - center[j]);
      const cToPerp = cross(unitAxis, cToStart);
      return center.map((c, j) => c + cosT * cToStart[j] + sinT * cToPerp[j]);
    });
  };
}

export function clockwisePath() {
  return pathAlongArc(-Math.PI);
}

export function counterclockwisePath() {
  return pathAlongArc(Math.PI);
}
