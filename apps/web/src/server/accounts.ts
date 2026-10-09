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

export const listAccountsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<Account[]>("/accounts"),
);

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

export const deleteAccountFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/accounts/${data.id}`, { method: "DELETE" }));
