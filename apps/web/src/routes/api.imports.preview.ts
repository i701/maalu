import { createFileRoute } from "@tanstack/react-router";
import { proxyToApi } from "#/utils/proxy";

/** Read a bank statement: the file is the body and `account_id` is in the query. Nothing is saved;
 * the API answers with what is in the file and what Maalu already knows about each row. */
export const Route = createFileRoute("/api/imports/preview")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const accountId = new URL(request.url).searchParams.get("account_id") ?? "";
				if (!/^[0-9a-f-]{36}$/i.test(accountId))
					return Response.json({ detail: "Account not found" }, { status: 404 });
				return proxyToApi(`/api/v1/imports/preview?account_id=${accountId}`, {
					method: "POST",
					body: await request.arrayBuffer(),
				});
			},
		},
	},
});
