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

// Data + Mobject core (Stage 2)
export * from './data/mobject_data.js';
export * from './mobject/mobject.js';
export * from './mobject/value_tracker.js';

// Rendering engine (Stage 3)
export * from './mobject/vmobject.js';

// 2D geometry (Stage 4)
export * from './mobject/geometry.js';
export * from './mobject/shape_matchers.js';

// Coordinates & functions (Stage 6)
export * from './mobject/functions.js';
export * from './mobject/coordinate_systems.js';
export * from './mobject/matrix.js';

// 3D surfaces & meshes (Stage 6: S6.4)
export * from './mobject/surface.js';
export * from './mobject/three_dimensions.js';

// Point clouds & images (Stage 6: S6.5)
export * from './mobject/point_cloud.js';
export * from './mobject/image_mobject.js';

// Vector fields (Stage 6: S6.6)
export * from './mobject/vector_field.js';

// Text & Tex (Stage 7)
export * from './mobject/svg/svg_path.js';
export * from './mobject/svg/svg_mobject.js';
export * from './mobject/svg/tex_mobject.js';
export * from './mobject/svg/text_mobject.js';
export * from './mobject/numbers.js';
export * from './animation/numbers.js';

// Animation system (Stage 5)
export * from './animation/animation.js';
export * from './animation/transform.js';
export * from './animation/transform_matching_parts.js';
export * from './animation/creation.js';
export * from './animation/growing.js';
export * from './animation/indication.js';
export * from './animation/fading.js';
export * from './animation/composition.js';
export * from './animation/rotation.js';
export * from './animation/update.js';
export * from './scene/scene.js';

export * from './camera/camera_frame.js';
export * from './camera/camera.js';
export * from './render/render_backend.js';
export * from './render/three/vmobject_geometry.js';
export * from './render/three/surface_geometry.js';
export * from './render/three/points_geometry.js';
export * from './render/three/image_geometry.js';
export * from './render/three/three_renderer.js';
export * from './render/three/shader_insert.js';

// Interaction — pointer events & picking (Stage 8.1)
export * from './interaction/events.js';

// Web component — <kty-scene> embeddable element (Stage 9.4)
export * from './web/kty_scene.js';

// Export — image (PNG) + SVG (Stage 9.3)
export * from './export/svg.js';
export * from './export/image.js';
