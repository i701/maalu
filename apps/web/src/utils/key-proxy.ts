import { getRequestIP } from "@tanstack/react-start/server";

/**
 * Lets something outside (a bot, a script, an AI agent) use the API with an **API key** through the
 * web app's own address, so one public address and one Cloudflare tunnel serve both. The API itself
 * is not published: only this server can reach it.
 *
 * It is deliberately narrow. It forwards a request only when it carries an API key (`mlk_...`) as a
 * bearer token, never a session token, and only to `/api/v1/...`. What the key may do is decided by
 * the API (its permissions, expiry and rate limit), not here; this only carries the request across.
 */

/** The biggest request body passed on (a statement import is the largest a key may send). */
export const MAX_BODY_BYTES = 10 * 1024 * 1024;

const KEY_BEARER = /^Bearer (mlk_[A-Za-z0-9_-]+)$/;

/** The API key in an `Authorization` header, or null when there is none (or it is a session token). */
export function keyFromAuthorization(header: string | null): string | null {
	return KEY_BEARER.exec(header?.trim() ?? "")?.[1] ?? null;
}

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
	const token = keyFromAuthorization(request.headers.get("authorization"));
	if (!token) {
		return json(401, "Send an API key as: Authorization: Bearer mlk_...", {
			"www-authenticate": "Bearer",
		});
	}
	const path = upstreamPath(splat);
	if (!path) return json(404, "Not found");

	const url = new URL(`/api/v1/${path}`, process.env.API_URL ?? "http://localhost:8000");
	url.search = new URL(request.url).search;

	const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
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
