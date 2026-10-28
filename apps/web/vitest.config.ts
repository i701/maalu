import { defineConfig } from "vitest/config";

// Unit tests for the pure helpers in src/lib (money maths, charts, budget). They need no DOM and
// none of the app's Vite plugins, so this is separate from vite.config.ts.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: { include: ["src/**/*.test.ts"], environment: "node" },
});
