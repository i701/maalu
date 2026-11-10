import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = resolve(__dirname, "../../public");
const read = (name: string) => readFileSync(resolve(publicDir, name), "utf8");
const manifest = JSON.parse(read("site.webmanifest")) as {
	id: string;
	name: string;
	start_url: string;
	scope: string;
	display: string;
	icons: { src: string; sizes: string; purpose?: string }[];
	shortcuts: { name: string; url: string }[];
};

const has = (size: string, purpose: string) =>
	manifest.icons.some((i) => i.sizes === size && i.purpose === purpose);

describe("the web app manifest", () => {
	it("names the app and opens it as a standalone app from the root", () => {
		expect(manifest.name).toBe("Maalu");
		expect(manifest.display).toBe("standalone");
		expect(manifest.start_url).toBe("/");
		expect(manifest.scope).toBe("/");
		expect(manifest.id).toBe("/");
	});

	it("has every icon it names, in the sizes browsers need, plain and maskable", () => {
		for (const icon of manifest.icons)
			expect(existsSync(resolve(publicDir, icon.src.slice(1)))).toBe(true);
		expect(has("192x192", "any") && has("512x512", "any")).toBe(true);
		expect(has("192x192", "maskable") && has("512x512", "maskable")).toBe(true);
	});

	it("only has shortcuts to pages that exist", () => {
		for (const s of manifest.shortcuts)
			expect(["/transactions", "/plan", "/accounts"]).toContain(s.url);
	});
});

describe("the service worker", () => {
	const sw = read("sw.js");

	it("never keeps a page, an API answer or a server function, only the app's own files", () => {
		// the only things it caches are decided by `strategy`: built files and static images
		expect(sw).toContain('url.pathname.startsWith("/assets/")');
		expect(sw).not.toMatch(/\/api\//);
		expect(sw).not.toContain("_serverFn");
		// a page request goes to the network, with the offline page only as the fallback
		expect(sw).toContain('request.mode === "navigate"');
		expect(sw).toContain("OFFLINE_URL");
	});

	it("has an offline page that needs nothing from the network", () => {
		const offline = read("offline.html");
		expect(offline).toContain("You are offline");
		expect(offline).not.toMatch(/https?:\/\//);
	});
});
