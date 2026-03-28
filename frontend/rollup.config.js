import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.ts",
  output: {
    file: "../custom_components/eppgrid/frontend/eppgrid-panel.js",
    format: "es",
    sourcemap: false,
  },
  plugins: [
    resolve(),
    json(),
    typescript(),
    terser(),
  ],
  onwarn(warning, warn) {
    // Suppress circular dependency warning from @formatjs internals
    if (warning.code === "CIRCULAR_DEPENDENCY" && warning.ids?.some(id => id.includes("@formatjs/"))) return;
    // Suppress sourcemap warning — we intentionally disable sourcemaps in production
    if (warning.code === "PLUGIN_WARNING" && warning.message?.includes("sourcemap")) return;
    warn(warning);
  },
};
