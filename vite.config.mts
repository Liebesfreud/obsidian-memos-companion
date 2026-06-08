import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        compatibility: {
          componentApi: 4
        }
      },
      preprocess: vitePreprocess()
    })
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      fileName: () => "main.js",
      formats: ["cjs"]
    },
    minify: false,
    outDir: ".",
    rollupOptions: {
      external: ["obsidian"],
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css") ? "styles.css" : "[name][extname]",
        exports: "default"
      }
    },
    sourcemap: "inline",
    target: "es2018"
  }
});
