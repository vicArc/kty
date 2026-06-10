// Port of manimlib/utils/dict_ops.py

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Float32Array);

/**
 * Merge objects; later objects win. Nested plain objects merge recursively.
 * Mirrors manim's merge_dicts_recursively.
 * @param {...Record<string, any>} objects
 */
export function mergeDictsRecursively(...objects) {
  const result = {};
  for (const obj of objects) {
    if (!obj) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (key in result && isPlainObject(result[key]) && isPlainObject(value)) {
        result[key] = mergeDictsRecursively(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
