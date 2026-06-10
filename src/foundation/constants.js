// Seed of the foundation layer (Stage 1 will flesh this out from manimlib/constants.py).
// Kept tiny here so the Stage 0 scaffold has something real to build and test.

export const PI = Math.PI;
export const TAU = 2 * Math.PI;
export const DEGREES = Math.PI / 180;

// Frame geometry (manim's default world is 8 units tall, 16:9).
export const FRAME_HEIGHT = 8.0;
export const ASPECT_RATIO = 16 / 9;
export const FRAME_WIDTH = FRAME_HEIGHT * ASPECT_RATIO;
export const FRAME_X_RADIUS = FRAME_WIDTH / 2;
export const FRAME_Y_RADIUS = FRAME_HEIGHT / 2;

// Direction vectors as plain tuples; Stage 1 may wrap these in THREE.Vector3.
export const ORIGIN = [0, 0, 0];
export const UP = [0, 1, 0];
export const DOWN = [0, -1, 0];
export const RIGHT = [1, 0, 0];
export const LEFT = [-1, 0, 0];
export const OUT = [0, 0, 1];
export const IN = [0, 0, -1];
