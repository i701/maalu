import { createFileRoute } from "@tanstack/react-router";
import { getAppSession } from "#/utils/session";

const API = () => process.env.API_URL ?? "http://localhost:8000";

/**
 * Download a backup (GET) or restore one (POST, the file as the body). The browser can't call the API
 * directly (the API token lives in the server-side session), so this route forwards both with the
 * token. A restore can change the base currency, which the session cookie caches, so it is read
 * again afterwards.
 */
export const Route = createFileRoute("/api/backup")({
	server: {
		handlers: {
			GET: async () => forward("/api/v1/backup", { method: "GET" }),
			POST: async ({ request }) =>
				forward("/api/v1/backup/restore", {
					method: "POST",
					body: await request.arrayBuffer(),
					refreshUser: true,
				}),
		},
	},
});

async function forward(
	path: string,
	{ method, body, refreshUser }: { method: string; body?: ArrayBuffer; refreshUser?: boolean },
) {
	const session = await getAppSession();
	const { token } = session.data;
	if (!token) return Response.json({ detail: "Session expired" }, { status: 401 });

	const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
	if (body) headers["Content-Type"] = "application/json";
	let upstream: Response;
	try {
		upstream = await fetch(new URL(path, API()), { method, headers, body });
	} catch {
		return Response.json({ detail: "Cannot reach the Maalu API" }, { status: 503 });
	}

	if (refreshUser && upstream.ok) {
		const me = await fetch(new URL("/api/v1/users/me", API()), {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);
		if (me)
			await session.update({
				user: { id: me.id, email: me.email, base_currency: me.base_currency },
			});
	}

	const out = new Headers({ "cache-control": "no-store" });
	for (const name of ["content-type", "content-disposition"]) {
		const value = upstream.headers.get(name);
		if (value) out.set(name, value);
	}
	return new Response(upstream.body, { status: upstream.status, headers: out });
}
