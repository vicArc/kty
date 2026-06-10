// Reproduces manim's `#INSERT <file>` GLSL preprocessor (shaders/inserts/NOTE.md):
// there is no #include for GLSL, so manim splices named snippets in by hand.
// Used only by the fidelity-fallback custom shaders (docs/02); native Three.js
// objects don't need it.

/**
 * Replace every `#INSERT name` line in `source` with `inserts[name]`.
 * Insert snippets may themselves contain `#INSERT` lines (resolved recursively).
 * Uniform declarations shared across snippets are de-duplicated.
 * @param {string} source
 * @param {Record<string, string>} inserts
 */
export function resolveInserts(source, inserts = {}, _seen = new Set()) {
  return source
    .split('\n')
    .map((line) => {
      const m = line.match(/^\s*#INSERT\s+(\S+)\s*$/);
      if (!m) return line;
      const name = m[1];
      if (!(name in inserts)) throw new Error(`Unknown #INSERT: ${name}`);
      if (_seen.has(name)) return ''; // already spliced once; avoid duplicate decls
      _seen.add(name);
      return resolveInserts(inserts[name], inserts, _seen);
    })
    .join('\n');
}

/** Drop duplicate `uniform ...;` declarations, keeping the first of each. */
export function dedupeUniforms(glsl) {
  const seen = new Set();
  return glsl
    .split('\n')
    .filter((line) => {
      const m = line.match(/^\s*uniform\s+\w+\s+(\w+)\s*;/);
      if (!m) return true;
      if (seen.has(m[1])) return false;
      seen.add(m[1]);
      return true;
    })
    .join('\n');
}
