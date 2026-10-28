import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	// Server functions read API_URL / SESSION_SECRET from process.env; Vite only
	// exposes VITE_* vars by default, so load the rest for dev.
	for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
		process.env[key] ??= value;
	}

	return {
		server: { port: 3000 },
		resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
		// Pre-bundle MUI up front. Routes are code-split, so otherwise Vite discovers these deps
		// mid-session, re-optimises, and a first click can hit a duplicate-React "Invalid hook call".
		optimizeDeps: {
			include: [
				"@mui/material/*",
				"@emotion/react",
				"@emotion/styled",
				"@emotion/cache",
				...[
					"AccountBalanceWallet",
					"Add",
					"Autorenew",
					"ChevronRight",
					"Clear",
					"ContentCopyOutlined",
					"DarkMode",
					"DeleteForeverOutlined",
					"DeleteOutlined",
					"Download",
					"Inventory2Outlined",
					"EditOutlined",
					"ExpandLess",
					"LightMode",
					"Logout",
					"Menu",
					"Person",
					"ReceiptLong",
					"Refresh",
					"RestoreFromTrashOutlined",
					"Search",
					"Storefront",
					"Tune",
					"UnarchiveOutlined",
				].map((icon) => `@mui/icons-material/${icon}`),
			],
		},
		// viteReact must come after tanstackStart
		plugins: [tanstackStart(), viteReact()],
	};
});
