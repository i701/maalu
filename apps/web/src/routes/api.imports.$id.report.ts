import { createFileRoute } from "@tanstack/react-router";
import { proxyToApi } from "#/utils/proxy";

/** The CSV report of one import: every row and what became of it. */
export const Route = createFileRoute("/api/imports/$id/report")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response(null, { status: 404 });
				return proxyToApi(`/api/v1/imports/${params.id}/report`);
			},
		},
	},
});
