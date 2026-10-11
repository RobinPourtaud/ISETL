import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  resolve: {
    alias: {
      "@isetl/runtime": fileURLToPath(
        new URL("../../packages/runtime/src/index.ts", import.meta.url),
      ),
    },
  },
  build: { outDir: "../../dist", emptyOutDir: true },
  worker: { format: "es" },
  server: { host: "127.0.0.1" },
});
