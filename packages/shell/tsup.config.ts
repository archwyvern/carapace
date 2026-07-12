import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/fs/client.ts", "src/fs/node.ts", "src/history/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom"],
});
