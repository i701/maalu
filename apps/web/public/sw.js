/* Maalu's service worker. It does two things and deliberately nothing more:
 *
 *  1. Keeps the app's own static files (scripts, styles, fonts, icons) so it opens fast and an
 *     installed copy starts without waiting on the network.
 *  2. Shows /offline.html instead of the browser's error page when a page cannot be reached.
 *
 * It NEVER stores a page, an API answer or a server-function response. Those hold the person's
 * money data and depend on their sign-in, so they always come from the network: nothing private is
 * left in a cache on a shared or lost device, and nothing can show stale figures. Offline reading
 * of data is a separate decision (see the notes), not something this file does by accident.
 *
 * A new version waits until the person taps "Reload" (the page sends SKIP_WAITING), so the app
 * never changes under someone in the middle of entering a transaction. */

const CACHE = "maalu-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/favicon.svg", "/icon-192.png", "/icon-512.png"];
const MAX_ENTRIES = 150; // hashed files pile up across releases, so the oldest are dropped

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
			await self.clients.claim();
		})(),
	);
});

self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** What may be kept, and how. Anything else goes straight to the network. */
function strategy(url) {
	// Built files are named after their contents, so a cached one can never be wrong.
	if (url.pathname.startsWith("/assets/")) return "cache-first";
	// Same name, may change between releases: show the kept copy, refresh it in the background.
	if (url.pathname.startsWith("/docs/") || /^\/(icon|apple-touch-icon|favicon)/.test(url.pathname))
		return "stale-while-revalidate";
	return null;
}

async function trim(cache) {
	const keys = await cache.keys();
	for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
}

async function remember(cache, request, response) {
	if (response.ok && response.type === "basic") {
		await cache.put(request, response.clone());
		await trim(cache);
	}
	return response;
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// A page: always the network (it is private and personal); the offline page if it cannot be reached.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
		);
		return;
	}

	const how = strategy(url);
	if (!how) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const kept = await cache.match(request);
			if (how === "cache-first") {
				return kept || remember(cache, request, await fetch(request));
			}
			const fresh = fetch(request)
				.then((response) => remember(cache, request, response))
				.catch(() => kept);
			return kept || fresh;
		})(),
	);
});
