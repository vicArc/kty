import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Library build: the engine is consumed as an ES module (`import { ... } from 'kty'`).
// `npm run dev` still serves index.html as an interactive dev harness.
// mathjax-full's version.js falls back to `eval('require')` in the browser
// unless the PACKAGE_VERSION global is defined; defining it skips that path.
const MATHJAX_VERSION = JSON.stringify('3.2.1');

export default defineConfig({
  define: { PACKAGE_VERSION: MATHJAX_VERSION },
  optimizeDeps: {
    esbuildOptions: { define: { PACKAGE_VERSION: MATHJAX_VERSION } },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'kty',
      fileName: 'kty',
      formats: ['es'],
    },
    rollupOptions: {
      // Keep heavy runtime deps external so the core bundle stays small; the dev
      // server and consumers resolve them from node_modules. Tex (mathjax-full)
      // and Text (opentype.js) are opt-in and shouldn't weigh down non-users.
      external: [/^three/, /^mathjax-full/, /^opentype\.js/],
    },
  },
});
