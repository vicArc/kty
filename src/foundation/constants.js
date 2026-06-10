// Port of manimlib/constants.py (the parts that aren't desktop-specific).
// Direction vectors are plain tuples; Stage 1+ may wrap them in THREE.Vector3.

// --- Math ---
export const PI = Math.PI;
export const TAU = 2 * Math.PI;
export const DEGREES = Math.PI / 180;
export const RADIANS = 180 / Math.PI;

// --- Frame geometry (manim's default world: 8 units tall, 16:9) ---
export const FRAME_HEIGHT = 8.0;
export const ASPECT_RATIO = 16 / 9;
export const FRAME_WIDTH = FRAME_HEIGHT * ASPECT_RATIO;
export const FRAME_X_RADIUS = FRAME_WIDTH / 2;
export const FRAME_Y_RADIUS = FRAME_HEIGHT / 2;
export const DEFAULT_PIXEL_WIDTH = 1920;
export const DEFAULT_PIXEL_HEIGHT = 1080;
export const DEFAULT_FPS = 30;

// --- Direction / position vectors ---
export const ORIGIN = [0, 0, 0];
export const UP = [0, 1, 0];
export const DOWN = [0, -1, 0];
export const RIGHT = [1, 0, 0];
export const LEFT = [-1, 0, 0];
export const IN = [0, 0, -1];
export const OUT = [0, 0, 1];
export const X_AXIS = [1, 0, 0];
export const Y_AXIS = [0, 1, 0];
export const Z_AXIS = [0, 0, 1];

export const UL = [-1, 1, 0];
export const UR = [1, 1, 0];
export const DL = [-1, -1, 0];
export const DR = [1, -1, 0];

export const TOP = [0, FRAME_Y_RADIUS, 0];
export const BOTTOM = [0, -FRAME_Y_RADIUS, 0];
export const LEFT_SIDE = [-FRAME_X_RADIUS, 0, 0];
export const RIGHT_SIDE = [FRAME_X_RADIUS, 0, 0];

// --- Spacing buffers ---
export const SMALL_BUFF = 0.1;
export const MED_SMALL_BUFF = 0.25;
export const MED_LARGE_BUFF = 0.5;
export const LARGE_BUFF = 1.0;
export const DEFAULT_MOBJECT_TO_EDGE_BUFF = 0.5;
export const DEFAULT_MOBJECT_TO_MOBJECT_BUFF = 0.25;

// --- Color palette (from default_config.yml `colors:`) ---
export const COLORS = {
  BLUE_E: '#1C758A',
  BLUE_D: '#29ABCA',
  BLUE_C: '#58C4DD',
  BLUE_B: '#9CDCEB',
  BLUE_A: '#C7E9F1',
  TEAL_E: '#49A88F',
  TEAL_D: '#55C1A7',
  TEAL_C: '#5CD0B3',
  TEAL_B: '#76DDC0',
  TEAL_A: '#ACEAD7',
  GREEN_E: '#699C52',
  GREEN_D: '#77B05D',
  GREEN_C: '#83C167',
  GREEN_B: '#A6CF8C',
  GREEN_A: '#C9E2AE',
  YELLOW_E: '#E8C11C',
  YELLOW_D: '#F4D345',
  YELLOW_C: '#FFFF00',
  YELLOW_B: '#FFEA94',
  YELLOW_A: '#FFF1B6',
  GOLD_E: '#C78D46',
  GOLD_D: '#E1A158',
  GOLD_C: '#F0AC5F',
  GOLD_B: '#F9B775',
  GOLD_A: '#F7C797',
  RED_E: '#CF5044',
  RED_D: '#E65A4C',
  RED_C: '#FC6255',
  RED_B: '#FF8080',
  RED_A: '#F7A1A3',
  MAROON_E: '#94424F',
  MAROON_D: '#A24D61',
  MAROON_C: '#C55F73',
  MAROON_B: '#EC92AB',
  MAROON_A: '#ECABC1',
  PURPLE_E: '#644172',
  PURPLE_D: '#715582',
  PURPLE_C: '#9A72AC',
  PURPLE_B: '#B189C6',
  PURPLE_A: '#CAA3E8',
  GREY_E: '#222222',
  GREY_D: '#444444',
  GREY_C: '#888888',
  GREY_B: '#BBBBBB',
  GREY_A: '#DDDDDD',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GREY_BROWN: '#736357',
  DARK_BROWN: '#8B4513',
  LIGHT_BROWN: '#CD853F',
  PINK: '#D147BD',
  LIGHT_PINK: '#DC75CD',
  GREEN_SCREEN: '#00FF00',
  ORANGE: '#FF862F',
};

// Convenient single-name aliases (manim exposes the "C" shade as the base name).
export const BLUE = COLORS.BLUE_C;
export const TEAL = COLORS.TEAL_C;
export const GREEN = COLORS.GREEN_C;
export const YELLOW = COLORS.YELLOW_C;
export const GOLD = COLORS.GOLD_C;
export const RED = COLORS.RED_C;
export const MAROON = COLORS.MAROON_C;
export const PURPLE = COLORS.PURPLE_C;
export const GREY = COLORS.GREY_C;
export const { WHITE, BLACK, PINK, ORANGE } = COLORS;

export const DEFAULT_MOBJECT_COLOR = WHITE;
export const DEFAULT_STROKE_COLOR = COLORS.GREY_A;
export const DEFAULT_FILL_COLOR = COLORS.GREY_C;
