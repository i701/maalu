import { createFileRoute } from "@tanstack/react-router";
import { proxyToApi } from "#/utils/proxy";

const UUID = /^[0-9a-f-]{36}$/i;

/** Show, download (`?download=true`) or delete one attachment, through the API. */
export const Route = createFileRoute("/api/attachments/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				if (!UUID.test(params.id)) return new Response(null, { status: 404 });
				const download = new URL(request.url).searchParams.get("download") === "true";
				return proxyToApi(`/api/v1/attachments/${params.id}${download ? "?download=true" : ""}`);
			},
			DELETE: async ({ params }) => {
				if (!UUID.test(params.id)) return new Response(null, { status: 404 });
				return proxyToApi(`/api/v1/attachments/${params.id}`, { method: "DELETE" });
			},
		},
	},
});
