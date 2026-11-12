import { getRequestIP } from "@tanstack/react-start/server";

/**
 * Lets something outside use the API through the web app's own address, so one public address and one
 * Cloudflare tunnel serve both the browser and everything else. The API itself is not published: only
 * this server can reach it.
 *
 * Two kinds of caller come through here, and it carries their requests across without deciding what they
 * may do (the API does: permissions, expiry, rate limits):
 *
 * - **An API key** (`mlk_...`), for a bot, a script or an AI agent.
 * - **A native app** (the Android and iOS apps), which is not a browser and so cannot use the website's own
 *   sign-in. It signs in here (`POST auth/login`, and `auth/login/2fa` for a second factor, which need no
 *   credential) and then sends the **session token** it got back as a bearer token, exactly as a browser
 *   session does through the website.
 *
 * It stays narrow in everything else: only `/api/v1/...`, only plain paths, only a bearer token in the
 * form of a key or a session token, and bodies up to a limit. The website's browser never uses this door;
 * it keeps its own cookie session.
 */

/** The biggest request body passed on (a statement import is the largest a key may send). */
export const MAX_BODY_BYTES = 10 * 1024 * 1024;

const KEY_BEARER = /^Bearer (mlk_[A-Za-z0-9_-]+)$/;
// A session token is `secrets.token_urlsafe(32)` on the API: 43 URL-safe characters, nothing else.
const SESSION_BEARER = /^Bearer ([A-Za-z0-9_-]{43})$/;

export type Credential = { kind: "key" | "session"; token: string };

/** The API key in an `Authorization` header, or null when there is none (or it is a session token). */
export function keyFromAuthorization(header: string | null): string | null {
	return KEY_BEARER.exec(header?.trim() ?? "")?.[1] ?? null;
}

/**
 * What a request is signed with: an API key, or the session token a native app got by signing in. Anything
 * else (a missing header, another scheme, a token of the wrong shape) is null.
 */
export function credentialFromAuthorization(header: string | null): Credential | null {
	const value = header?.trim() ?? "";
	const key = KEY_BEARER.exec(value)?.[1];
	if (key) return { kind: "key", token: key };
	const session = SESSION_BEARER.exec(value)?.[1];
	return session ? { kind: "session", token: session } : null;
}

/** The only two calls that need no credential: signing in, and the second step of it. */
const OPEN_ROUTES = new Set(["POST auth/login", "POST auth/login/2fa", "GET server"]);

/** Whether `method` on `path` (as returned by `upstreamPath`) may be made without being signed in. */
export const isOpenRoute = (method: string, path: string): boolean =>
	OPEN_ROUTES.has(`${method.toUpperCase()} ${path}`);

/**
 * The path to call on the API for the part of the address after `/api/v1/`, or null when it is not
 * a plain path (empty, or trying to climb out with `..`, or carrying anything but path characters).
 */
export function upstreamPath(splat: string | undefined): string | null {
	const path = (splat ?? "").replace(/^\/+/, "");
	if (!path || path.length > 300) return null;
	if (!/^[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(path)) return null;
	let decoded: string;
	try {
		decoded = decodeURIComponent(path);
	} catch {
		return null;
	}
	if (decoded.split("/").some((part) => part === ".." || part === ".")) return null;
	return path;
}

const PASS_ON = ["content-type", "x-total-count", "retry-after", "www-authenticate"];

const json = (status: number, detail: string, headers: Record<string, string> = {}) =>
	Response.json({ detail }, { status, headers: { "cache-control": "no-store", ...headers } });

/** Carry one request to the API and hand the answer back. */
export async function forwardKeyRequest(request: Request, splat: string | undefined) {
	const credential = credentialFromAuthorization(request.headers.get("authorization"));
	const path = upstreamPath(splat);
	if (!path) return json(404, "Not found");
	// Signing in, and asking what server this is, are the only things that need no credential; everything else needs a key or a session token.
	if (!credential && !isOpenRoute(request.method, path)) {
		return json(401, "Sign in, or send an API key as: Authorization: Bearer mlk_...", {
			"www-authenticate": "Bearer",
		});
	}

	const url = new URL(`/api/v1/${path}`, process.env.API_URL ?? "http://localhost:8000");
	url.search = new URL(request.url).search;

	const headers: Record<string, string> = {};
	if (credential) headers.Authorization = `Bearer ${credential.token}`;
	// The API only sees this server: pass on the caller's address, so what it records (and the
	// limits) are about the caller and not this server.
	const caller = getRequestIP({ xForwardedFor: true });
	if (caller) headers["X-Forwarded-For"] = caller;
	const contentType = request.headers.get("content-type");
	if (contentType) headers["Content-Type"] = contentType;

	let body: ArrayBuffer | undefined;
	if (!["GET", "HEAD"].includes(request.method)) {
		body = await request.arrayBuffer();
		if (body.byteLength > MAX_BODY_BYTES) return json(413, "That request is too large");
	}

	let upstream: Response;
	try {
		upstream = await fetch(url, { method: request.method, headers, body });
	} catch {
		return json(503, "Cannot reach the Maalu API");
	}

	const out = new Headers({ "cache-control": "no-store" });
	for (const name of PASS_ON) {
		const value = upstream.headers.get(name);
		if (value) out.set(name, value);
	}
	return new Response(upstream.status === 204 ? null : upstream.body, {
		status: upstream.status,
		headers: out,
	});
}
