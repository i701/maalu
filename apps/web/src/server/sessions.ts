import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EndedSessions, SessionInfo } from "#/types/api";
import { apiRequest } from "./api";

/** Where you are signed in, the most recently used first. */
export const listSessionsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<SessionInfo[]>("/auth/sessions"),
);

/** Sign out one of your other sign-ins. */
export const endSessionFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/auth/sessions/${data.id}`, { method: "DELETE" }));

/** Sign out everywhere else: every sign-in but this one. */
export const endOtherSessionsFn = createServerFn({ method: "POST" }).handler(async () =>
	apiRequest<EndedSessions>("/auth/sessions/end-others", { method: "POST" }),
);
