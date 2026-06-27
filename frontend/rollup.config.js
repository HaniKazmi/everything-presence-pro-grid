import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const plugins = [
	resolve({ browser: true }),
	commonjs(),
	json(),
	typescript(),
	terser(),
];

function onwarn(warning, warn) {
	if (
		warning.code === "CIRCULAR_DEPENDENCY" &&
		warning.ids?.some((id) => id.includes("@formatjs/"))
	)
		return;
	if (
		warning.code === "PLUGIN_WARNING" &&
		warning.message?.includes("sourcemap")
	)
		return;
	warn(warning);
}

export default [
	{
		input: "src/index.ts",
		output: {
			file: "../custom_components/eppgrid/frontend/eppgrid-panel.js",
			format: "es",
			sourcemap: false,
			inlineDynamicImports: true,
		},
		plugins,
		onwarn,
	},
	{
		input: "src/card/index.ts",
		output: {
			file: "../custom_components/eppgrid/frontend/eppgrid-card.js",
			format: "es",
			sourcemap: false,
			inlineDynamicImports: true,
		},
		plugins,
		onwarn,
	},
];
