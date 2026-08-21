import { defineConfig } from "vite";

export default defineConfig({
  root: "github-pages",
  base: "/calflow-engineering/",
  publicDir: "../public",
  build: {
    outDir: "../gh-pages-dist",
    emptyOutDir: true,
  },
});
