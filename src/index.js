// Public API barrel for kty. Stage modules re-export through here as they land
// (foundation → data → mobject → animation → scene → camera → render → authoring → export).

export const VERSION = '0.0.0';

// Foundation layer (Stage 1)
export * from './foundation/constants.js';
export * from './foundation/simple_functions.js';
export * from './foundation/dict_ops.js';
export * from './foundation/family_ops.js';
export * from './foundation/iterables.js';
export * from './foundation/bezier.js';
export * from './foundation/rate_functions.js';
export * from './foundation/space_ops.js';
export * from './foundation/paths.js';
export * from './foundation/color.js';
export * from './foundation/arrays.js';
export * from './foundation/config.js';
