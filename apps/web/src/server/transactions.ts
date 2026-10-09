import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PAYMENT_METHODS, type Transaction } from "#/types/api";
import { apiRequest } from "./api";

export const PAGE_SIZE = 20;

// Decimals are validated as strings and forwarded untouched: no float round-trip.
const amount = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Enter a valid amount (max 4 decimals)");
const exchangeRate = z
	.string()
	.regex(/^\d+(\.\d{1,8})?$/, "Enter a valid rate (max 8 decimals)")
	.refine((v) => Number(v) > 0, "Rate must be greater than 0");
const currency = z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code");

const createSchema = z.object({
	amount,
	currency: currency.optional(),
	exchange_rate: exchangeRate.optional(),
	payment_method: z.enum(PAYMENT_METHODS),
	category: z.string().trim().min(1).max(100),
	description: z.string().nullable().optional(),
	transaction_date: z.iso.date(),
	vendor_name: z.string().trim().min(1).max(200).optional(),
	subscription_id: z.uuid().optional(),
});

const updateSchema = z.object({
	id: z.uuid(),
	changes: createSchema
		.omit({ vendor_name: true })
		.partial()
		.extend({
			vendor_name: z.string().trim().min(1).max(200).optional(),
			vendor_id: z.null().optional(), // explicit null unlinks the vendor
			subscription_id: z.uuid().nullable().optional(), // explicit null unlinks the subscription
		}),
});

const listSchema = z.object({
	page: z.number().int().min(1).default(1),
	payment_method: z.enum(PAYMENT_METHODS).optional(),
	vendor_id: z.uuid().optional(),
	currency: currency.optional(),
});

export const listTransactionsFn = createServerFn({ method: "GET" })
	.validator(listSchema)
	.handler(async ({ data }) => {
		// Ask for one extra row so the UI knows whether a next page exists.
		const res = await apiRequest<Transaction[]>("/transactions", {
			query: {
				limit: PAGE_SIZE + 1,
				offset: (data.page - 1) * PAGE_SIZE,
				payment_method: data.payment_method,
				vendor_id: data.vendor_id,
				currency: data.currency,
			},
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: { items: res.data.slice(0, PAGE_SIZE), hasMore: res.data.length > PAGE_SIZE },
		};
	});

export const createTransactionFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) =>
		apiRequest<Transaction>("/transactions", { method: "POST", body: data }),
	);

export const updateTransactionFn = createServerFn({ method: "POST" })
	.validator(updateSchema)
	.handler(async ({ data }) =>
		apiRequest<Transaction>(`/transactions/${data.id}`, {
			method: "PATCH",
			body: data.changes,
		}),
	);

export const deleteTransactionFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/transactions/${data.id}`, { method: "DELETE" }));
