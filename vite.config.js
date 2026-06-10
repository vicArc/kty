import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Library build: the engine is consumed as an ES module (`import { ... } from 'kty'`).
// `npm run dev` still serves index.html as an interactive dev harness.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'kty',
      fileName: 'kty',
      formats: ['es'],
    },
    rollupOptions: {
      // three is a peer at runtime for consumers; keep it external in the lib bundle.
      external: ['three'],
    },
  },
});
