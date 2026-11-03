import { expect, test } from "@playwright/test";
import { open, signUp } from "./helpers";

// Every page a new person can reach opens without the app's error screen. The main use is to catch
// a loader that fails (an API change not matched in the web app, a server error under parallel
// requests) before a person sees "Something went wrong".
const PAGES = [
	"/dashboard",
	"/transactions",
	"/accounts",
	"/subscriptions",
	"/net-worth",
	"/compare",
	"/trends",
	"/import",
	"/places",
	"/budget",
	"/vendors",
	"/categories",
	"/tags",
	"/groups",
	"/templates",
	"/trash",
	"/notifications",
	"/settings",
	"/profile",
];

test("every page opens without an error", async ({ page }) => {
	test.setTimeout(120_000); // sixteen pages, each a full server render
	await signUp(page);
	for (const path of PAGES) {
		await open(page, path);
		await expect(page, path).toHaveURL(new RegExp(`${path}`));
		await expect(page.getByText("Something went wrong"), path).toBeHidden();
		await expect(page.getByRole("main"), path).toBeVisible();
	}
});
