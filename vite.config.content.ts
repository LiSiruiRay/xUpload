import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Separate Vite config for the content script.
 *
 * Chrome extension content scripts are injected as classic (non-module) scripts,
 * so they CANNOT use ES module `import`/`export` syntax.
 * We build content.ts as a self-contained IIFE with all dependencies inlined.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: false, // Don't clear — the main build already populated dist/
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "iife",
      },
    },
  },
});
