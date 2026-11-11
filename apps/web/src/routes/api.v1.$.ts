import { createFileRoute } from "@tanstack/react-router";
import { forwardKeyRequest } from "#/utils/key-proxy";

/**
 * `/api/v1/...` on the web address: the API, for API keys and for native apps. A bot or script calls
 * `https://your-maalu/api/v1/accounts` with `Authorization: Bearer mlk_...`; a native app signs in at
 * `/api/v1/auth/login` and then sends its session token the same way. This carries the request to the API
 * (which is not published) and the answer back. The website's own browser does not use this. See
 * `utils/key-proxy.ts`.
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
