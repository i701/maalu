import { createFileRoute } from "@tanstack/react-router";
import { proxyToApi } from "#/utils/proxy";

/** Attach a file to a transaction: the file is the body, `transaction_id` and `filename` are in the
 * query. Forwarded to the API, which checks it. */
export const Route = createFileRoute("/api/attachments")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const incoming = new URL(request.url).searchParams;
				const transactionId = incoming.get("transaction_id") ?? "";
				if (!/^[0-9a-f-]{36}$/i.test(transactionId))
					return Response.json({ detail: "Transaction not found" }, { status: 404 });
				const filename = new URLSearchParams({
					filename: incoming.get("filename") ?? "attachment",
				});
				return proxyToApi(`/api/v1/transactions/${transactionId}/attachments?${filename}`, {
					method: "POST",
					body: await request.arrayBuffer(),
				});
			},
		},
	},
});
