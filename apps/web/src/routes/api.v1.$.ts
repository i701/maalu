import { createFileRoute } from "@tanstack/react-router";
import { forwardKeyRequest } from "#/utils/key-proxy";

/**
 * `/api/v1/...` on the web address: the API, for API keys. A bot or script calls
 * `https://your-maalu/api/v1/accounts` with `Authorization: Bearer mlk_...` and this carries the
 * request to the API (which is not published) and the answer back. Anything that is not an API key
 * is refused here, so this is not a way in for a browser session. See `utils/key-proxy.ts`.
 */
const handle = ({ request, params }: { request: Request; params: { _splat?: string } }) =>
	forwardKeyRequest(request, params["_splat"]);

export const Route = createFileRoute("/api/v1/$")({
	server: {
		handlers: {
			GET: handle,
			POST: handle,
			PATCH: handle,
			PUT: handle,
			DELETE: handle,
		},
	},
});
