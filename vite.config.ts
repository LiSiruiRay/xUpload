import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Main Vite config — builds background service worker + popup.
 *
 * The content script is built separately via vite.config.content.ts
 * because content scripts must be classic (non-module) scripts and
 * cannot use ES module `import`/`export`.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        popup: resolve(__dirname, "popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
});
