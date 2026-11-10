import { expect, test } from "@playwright/test";
import { open, signUp } from "./helpers";

test("the app has a manifest and registers its service worker", async ({ page }) => {
	await open(page, "/login");

	// the manifest is linked and describes an installable app
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/site.webmanifest");
	const manifest = await (await page.request.get("/site.webmanifest")).json();
	expect(manifest.name).toBe("Maalu");
	expect(manifest.display).toBe("standalone");
	expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);

	// the production build registers the worker, and it takes over
	const state = await page.evaluate(async () => {
		const registration = await navigator.serviceWorker.ready;
		return registration.active?.state;
	});
	expect(state).toBe("activated");

	// the offline page is kept, so a lost connection shows it instead of the browser's error
	const offline = await page.evaluate(async () => {
		const response = await caches.match("/offline.html");
		return response ? await response.text() : null;
	});
	expect(offline).toContain("You are offline");
});

test("the worker never keeps a page or an API answer", async ({ page }) => {
	await signUp(page);
	await open(page, "/accounts");
	const kept = await page.evaluate(async () => {
		const urls: string[] = [];
		for (const name of await caches.keys()) {
			for (const request of await (await caches.open(name)).keys())
				urls.push(new URL(request.url).pathname);
		}
		return urls;
	});
	// only the app's own files: no page, no server function, no API path
	for (const path of kept) {
		expect(path).toMatch(/^\/(assets\/|docs\/|icon|apple-touch-icon|favicon|offline\.html)/);
	}
});

test("Settings offers to install the app and says what it does", async ({ page }) => {
	await signUp(page);
	await open(page, "/settings");
	await expect(page.getByText("Install the app")).toBeVisible();
	await expect(page.getByText(/Installing keeps no money data on the device/)).toBeVisible();
});
