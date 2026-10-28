import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ACCOUNT_GROUPS, type Account, type AccountSummary } from "#/types/api";
import { apiRequest } from "./api";

// Signed decimal string (negative = money owed); forwarded untouched, no float round-trip.
const balance = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Enter a valid amount (max 4 decimals)");
const exchangeRate = z
	.string()
	.regex(/^\d+(\.\d{1,8})?$/, "Enter a valid rate (max 8 decimals)")
	.refine((v) => Number(v) > 0, "Rate must be greater than 0");
const currency = z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code");

const createSchema = z.object({
	group: z.enum(ACCOUNT_GROUPS),
	name: z.string().trim().min(1).max(200),
	opening_amount: balance.optional(),
	currency: currency.optional(),
	exchange_rate: exchangeRate.optional(),
	description: z.string().max(1000).nullable().optional(),
});

const updateSchema = z.object({
	id: z.uuid(),
	changes: createSchema.partial(),
});

/** Every account in use, or only those whose name or description contains `q`. `archived` lists
 * the archived ones instead. */
export const listAccountsFn = createServerFn({ method: "GET" })
	.validator(
		z.object({ q: z.string().max(100).optional(), archived: z.boolean().optional() }).optional(),
	)
	.handler(async ({ data }) =>
		apiRequest<Account[]>("/accounts", {
			query: { q: data?.q || undefined, archived: data?.archived ? "true" : undefined },
		}),
	);

/** Server-side search for pickers/autocompletes: matches name and description. */
export const searchAccountsFn = createServerFn({ method: "GET" })
	.validator(z.object({ q: z.string().max(100).default("") }))
	.handler(async ({ data }) =>
		apiRequest<Account[]>("/accounts", { query: { q: data.q, limit: 20 } }),
	);

/** One account by id, to show the selected value of an autocomplete. */
export const getAccountFn = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<Account>(`/accounts/${data.id}`));

export const getAccountSummaryFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<AccountSummary>("/accounts/summary"),
);

export const createAccountFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) => apiRequest<Account>("/accounts", { method: "POST", body: data }));

export const updateAccountFn = createServerFn({ method: "POST" })
	.validator(updateSchema)
	.handler(async ({ data }) =>
		apiRequest<Account>(`/accounts/${data.id}`, { method: "PATCH", body: data.changes }),
	);

export const archiveAccountFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Account>(`/accounts/${data.id}/archive`, { method: "POST" }),
	);

export const unarchiveAccountFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Account>(`/accounts/${data.id}/unarchive`, { method: "POST" }),
	);

export const deleteAccountFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/accounts/${data.id}`, { method: "DELETE" }));
