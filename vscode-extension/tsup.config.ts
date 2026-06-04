import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
  format: ["cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  shims: false,
  external: ["vscode"],
});
