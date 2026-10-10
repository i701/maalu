import { createFileRoute } from "@tanstack/react-router";
import { getAppSession } from "#/utils/session";

// Only these filters are forwarded to the API (which validates them again).
const FILTERS = [
	"q",
	"type",
	"payment_method",
	"vendor_id",
	"account_id",
	"subscription_id",
	"currency",
	"min_amount",
	"max_amount",
	"date_from",
	"date_to",
] as const;

/**
 * Download the filtered transactions as an Excel file. The browser can't call the API directly
 * (the API token lives in the server-side session), so this route forwards the request with the
 * token and streams the file back.
 */
export const Route = createFileRoute("/api/export/transactions")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { token, expiresAt } = (await getAppSession()).data;
				if (!token || (expiresAt && expiresAt * 1000 <= Date.now())) {
					return Response.json({ detail: "Session expired" }, { status: 401 });
				}

				const incoming = new URL(request.url).searchParams;
				const url = new URL(
					"/api/v1/transactions/export",
					process.env.API_URL ?? "http://localhost:8000",
				);
				for (const key of FILTERS) {
					const value = incoming.get(key);
					if (value) url.searchParams.set(key, value);
				}

				let upstream: Response;
				try {
					upstream = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
				} catch {
					return Response.json({ detail: "Cannot reach the Maalu API" }, { status: 503 });
				}

				const headers = new Headers();
				for (const name of ["content-type", "content-disposition"]) {
					const value = upstream.headers.get(name);
					if (value) headers.set(name, value);
				}
				headers.set("cache-control", "no-store");
				return new Response(upstream.body, { status: upstream.status, headers });
			},
		},
	},
});
