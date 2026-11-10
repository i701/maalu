import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiKey, ApiKeySecret, ScopeCatalog } from "#/types/api";
import { apiRequest } from "./api";

const id = z.uuid();
const name = z.string().trim().min(1).max(100);
const scopes = z.array(z.string().max(64)).max(100);
const days = z.number().int().min(1).max(3650);

/** Your API keys, newest first. A secret is never in the list. */
export const listApiKeysFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<ApiKey[]>("/api-keys"),
);

/** The permissions a key can hold and the roles that bundle them. */
export const getScopeCatalogFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<ScopeCatalog>("/api-keys/scopes"),
);

/** Make a key. The secret is in the answer once. */
export const createApiKeyFn = createServerFn({ method: "POST" })
	.validator(z.object({ name, scopes, expires_in_days: days.nullable() }))
	.handler(async ({ data }) =>
		apiRequest<ApiKeySecret>("/api-keys", { method: "POST", body: data }),
	);

/** Rename a key, change what it may do, or change how long it lasts (only what is sent changes;
 * an explicit null for `expires_in_days` means it never expires). */
export const updateApiKeyFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id,
			changes: z.object({
				name: name.optional(),
				scopes: scopes.optional(),
				expires_in_days: days.nullable().optional(),
			}),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<ApiKey>(`/api-keys/${data.id}`, { method: "PATCH", body: data.changes }),
	);

/** Replace a key's secret; the old one can keep working for `grace_hours`. */
export const rotateApiKeyFn = createServerFn({ method: "POST" })
	.validator(z.object({ id, grace_hours: z.number().int().min(0).max(168) }))
	.handler(async ({ data }) =>
		apiRequest<ApiKeySecret>(`/api-keys/${data.id}/rotate`, {
			method: "POST",
			body: { grace_hours: data.grace_hours },
		}),
	);

/** Delete a key: it stops working at once. */
export const deleteApiKeyFn = createServerFn({ method: "POST" })
	.validator(z.object({ id }))
	.handler(async ({ data }) => apiRequest<void>(`/api-keys/${data.id}`, { method: "DELETE" }));
