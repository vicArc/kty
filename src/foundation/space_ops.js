// Port of the core of manimlib/utils/space_ops.py (vectors as number[]).
// Rotation matrices follow scipy's from_rotvec convention (Rodrigues).

import { clip } from './simple_functions.js';

export function cross(v1, v2) {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

/** 2D scalar cross product (z-component of the 3D cross). */
export function cross2d(a, b) {
  return a[0] * b[1] - a[1] * b[0];
}

export function dot(v1, v2) {
  let s = 0;
  for (let i = 0; i < v1.length; i++) s += v1[i] * v2[i];
  return s;
}

export function getNorm(vect) {
  let s = 0;
  for (const x of vect) s += x * x;
  return Math.sqrt(s);
}

export function getDist(v1, v2) {
  return getNorm(v1.map((x, i) => v2[i] - x));
}

export function normalize(vect, fallBack = null) {
  const norm = getNorm(vect);
  if (norm > 0) return vect.map((x) => x / norm);
  if (fallBack !== null) return [...fallBack];
  return vect.map(() => 0);
}

export function midpoint(a, b) {
  return a.map((x, i) => (x + b[i]) / 2);
}

/** Angle of a 2D/3D vector in the xy-plane, in radians. */
export function angleOfVector(vect) {
  return Math.atan2(vect[1], vect[0]);
}

export function angleBetweenVectors(v1, v2) {
  const n1 = normalize(v1);
  const n2 = normalize(v2);
  return Math.acos(clip(dot(n1, n2), -1, 1));
}

/** 3x3 rotation matrix about an arbitrary axis (Rodrigues' formula). */
export function rotationMatrix(angle, axis) {
  const [x, y, z] = normalize(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}

export function rotationAboutZ(angle) {
  return rotationMatrix(angle, [0, 0, 1]);
}

/** Apply a 3x3 matrix to a 3-vector. */
export function applyMatrix(matrix, vect) {
  return matrix.map((row) => dot(row, vect));
}

/** Rotate a 3-vector by `angle` about `axis` (default +z). */
export function rotateVector(vector, angle, axis = [0, 0, 1]) {
  return applyMatrix(rotationMatrix(angle, axis), vector);
}

/** Rotate a 2-vector by `angle`. */
export function rotateVector2d(vector, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [vector[0] * c - vector[1] * s, vector[0] * s + vector[1] * c];
}
