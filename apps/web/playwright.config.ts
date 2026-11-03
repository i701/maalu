import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: a real browser against a real API and a production build of the web app. They
// use their own database (maalu_e2e) and ports, so a running `just dev` and its data are never
// touched. `just e2e` makes the database and runs this; every test signs up its own user, so tests
// don't depend on each other or on leftover data and can run in parallel.
const API_PORT = 8101;
const WEB_PORT = 3101;
const DATABASE_URL =
	process.env.E2E_DATABASE_URL ?? "postgresql+asyncpg://maalu:maalu@localhost:5432/maalu_e2e";

export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	workers: process.env.CI ? 2 : 4, // one API and one web server serve every worker
	expect: { timeout: 15_000 }, // sign-up and sign-in hash a password, which is slow when tests run side by side
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${WEB_PORT}`,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			// migrate the e2e database, then serve the API
			command: `uv run alembic upgrade head && uv run fastapi run main.py --port ${API_PORT}`,
			cwd: "../api",
			url: `http://localhost:${API_PORT}/docs`,
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			env: {
				DATABASE_URL,
				SECRET_KEY: "e2e-not-a-secret-e2e-not-a-secret-e2e-not-a-secret",
				REGISTRATION: "open", // every test signs up its own user
				RATE_LIMIT: "false", // many sign-ins from one address
				GEOCODER_URL: "", // no outside calls from the tests
			},
		},
		{
			command: `pnpm build && pnpm start --port ${WEB_PORT}`,
			url: `http://localhost:${WEB_PORT}/login`,
			timeout: 240_000,
			reuseExistingServer: !process.env.CI,
			env: {
				API_URL: `http://127.0.0.1:${API_PORT}`,
				SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0123456789",
			},
		},
	],
});
