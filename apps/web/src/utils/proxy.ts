import { getAppSession } from "#/utils/session";

/**
 * Forward a request to the API with the session's token and hand the answer back, for the routes
 * that carry files (the browser cannot reach the API itself: the token lives in the server-side
 * session). Only a few response headers are passed on.
 */
export async function proxyToApi(
	path: string,
	{ method = "GET", body }: { method?: string; body?: ArrayBuffer } = {},
): Promise<Response> {
	const { token } = (await getAppSession()).data;
	if (!token) return Response.json({ detail: "Session expired" }, { status: 401 });

	const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
	if (body) headers["Content-Type"] = "application/octet-stream";
	let upstream: Response;
	try {
		upstream = await fetch(new URL(path, process.env.API_URL ?? "http://localhost:8000"), {
			method,
			headers,
			body,
		});
	} catch {
		return Response.json({ detail: "Cannot reach the Maalu API" }, { status: 503 });
	}

	const out = new Headers();
	for (const name of [
		"content-type",
		"content-disposition",
		"cache-control",
		"x-content-type-options",
	]) {
		const value = upstream.headers.get(name);
		if (value) out.set(name, value);
	}
	if (!out.has("cache-control")) out.set("cache-control", "no-store");
	return new Response(upstream.status === 204 ? null : upstream.body, {
		status: upstream.status,
		headers: out,
	});
}
