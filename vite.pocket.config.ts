import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const testKeys = process.env.POCKET_LICENSE_TEST_KEYS?.trim() || undefined;

export default defineConfig({
  base: "./",
  publicDir: false,
  define: {
    __POCKET_LICENSE_ENFORCED__: "true",
    // Browser-test builds only (separate outDir); the APK build never sets this.
    __POCKET_LICENSE_TEST_KEYS__: testKeys ?? "undefined",
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  build: {
    outDir: testKeys ? "dist/pocket-offline-test" : "dist/pocket-offline",
    emptyOutDir: true,
    assetsDir: "assets",
    cssCodeSplit: false,
    modulePreload: false,
    target: "es2018",
    rollupOptions: {
      input: path.resolve(rootDir, "pocket-offline.html"),
      output: {
        format: "iife",
        name: "PocketOfflineApp",
        inlineDynamicImports: true,
        entryFileNames: "assets/pocket.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    port: 5179,
    host: "0.0.0.0",
  },
});
