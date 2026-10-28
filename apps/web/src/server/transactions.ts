import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	PAYMENT_METHODS,
	TRANSACTION_TYPES,
	type CategoryTotals,
	type Transaction,
	type TransactionTotals,
} from "#/types/api";
import type { PageResult } from "#/lib/pagination";
import { apiRequest } from "./api";

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "#/lib/pagination";

// Decimals are validated as strings and forwarded untouched: no float round-trip. Amounts are
// always positive: the transaction `type` decides whether money comes in or goes out.
const amount = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a valid positive amount (max 4 decimals)")
	.refine((v) => Number(v) > 0, "Amount must be greater than 0");
const exchangeRate = z
	.string()
	.regex(/^\d+(\.\d{1,8})?$/, "Enter a valid rate (max 8 decimals)")
	.refine((v) => Number(v) > 0, "Rate must be greater than 0");
const currency = z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code");

const splitSchema = z.object({
	name: z.string().trim().min(1).max(200),
	quantity: z
		.string()
		.regex(/^\d+(\.\d{1,3})?$/)
		.refine((v) => Number(v) > 0),
	category: z.string().trim().min(1).max(100),
	amount,
	tax_amount: z
		.string()
		.regex(/^\d+(\.\d{1,4})?$/)
		.nullable()
		.optional(),
});

const createSchema = z.object({
	type: z.enum(TRANSACTION_TYPES),
	amount,
	currency: currency.optional(),
	exchange_rate: exchangeRate.optional(),
	// Required for income/expense; transfers have neither (the API enforces this).
	payment_method: z.enum(PAYMENT_METHODS).optional(),
	category: z.string().trim().min(1).max(100).optional(),
	description: z.string().nullable().optional(),
	transaction_date: z.iso.date(),
	splits: z.array(splitSchema).min(1).optional(),
	vendor_name: z.string().trim().min(1).max(200).optional(),
	subscription_id: z.uuid().optional(),
	account_id: z.uuid().optional(),
	to_account_id: z.uuid().optional(),
	to_amount: amount.optional(),
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
			account_id: z.uuid().nullable().optional(), // explicit null unlinks the account
			to_account_id: z.uuid().nullable().optional(),
			splits: z.array(splitSchema).min(1).nullable().optional(), // explicit null removes the split
		}),
});

const listSchema = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z
		.number()
		.int()
		.refine((v) => PAGE_SIZES.includes(v))
		.default(DEFAULT_PAGE_SIZE),
	type: z.enum(TRANSACTION_TYPES).optional(),
	payment_method: z.enum(PAYMENT_METHODS).optional(),
	vendor_id: z.uuid().optional(),
	category_id: z.uuid().optional(),
	account_id: z.uuid().optional(),
	currency: currency.optional(),
	q: z.string().max(100).optional(),
	// In the user's base currency, inclusive. Decimal strings, never floats.
	min_amount: z
		.string()
		.regex(/^\d+(\.\d{1,4})?$/)
		.optional(),
	max_amount: z
		.string()
		.regex(/^\d+(\.\d{1,4})?$/)
		.optional(),
	// Inclusive YYYY-MM-DD bounds on the transaction date.
	date_from: z.iso.date().optional(),
	date_to: z.iso.date().optional(),
});

export const listTransactionsFn = createServerFn({ method: "GET" })
	.validator(listSchema)
	.handler(async ({ data }) => {
		const res = await apiRequest<Transaction[]>("/transactions", {
			query: {
				limit: data.pageSize,
				offset: (data.page - 1) * data.pageSize,
				type: data.type,
				payment_method: data.payment_method,
				vendor_id: data.vendor_id,
				category_id: data.category_id,
				account_id: data.account_id,
				currency: data.currency,
				q: data.q,
				min_amount: data.min_amount,
				max_amount: data.max_amount,
				date_from: data.date_from,
				date_to: data.date_to,
			},
		});
		if (!res.ok) return res;
		// `total` is the number of matches across all pages (the API's X-Total-Count header).
		return {
			ok: true as const,
			data: {
				items: res.data,
				total: res.total ?? res.data.length,
			} satisfies PageResult<Transaction>,
		};
	});

/** Income / expense totals (base currency) for the same filters as the list. */
export const getTransactionTotalsFn = createServerFn({ method: "GET" })
	.validator(listSchema.omit({ page: true, pageSize: true }))
	.handler(async ({ data }) =>
		apiRequest<TransactionTotals>("/transactions/summary", {
			query: {
				type: data.type,
				payment_method: data.payment_method,
				vendor_id: data.vendor_id,
				category_id: data.category_id,
				account_id: data.account_id,
				currency: data.currency,
				q: data.q,
				min_amount: data.min_amount,
				max_amount: data.max_amount,
				date_from: data.date_from,
				date_to: data.date_to,
			},
		}),
	);

/** Income / expense per category (base currency) for the same filters as the list. */
export const getCategoryTotalsFn = createServerFn({ method: "GET" })
	.validator(listSchema.omit({ page: true, pageSize: true }))
	.handler(async ({ data }) =>
		apiRequest<CategoryTotals>("/transactions/categories", {
			query: {
				type: data.type,
				payment_method: data.payment_method,
				vendor_id: data.vendor_id,
				category_id: data.category_id,
				account_id: data.account_id,
				currency: data.currency,
				q: data.q,
				min_amount: data.min_amount,
				max_amount: data.max_amount,
				date_from: data.date_from,
				date_to: data.date_to,
			},
		}),
	);

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

/** Moves the transaction to the trash; it can be restored from there. */
export const deleteTransactionFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/transactions/${data.id}`, { method: "DELETE" }));

export const listTrashFn = createServerFn({ method: "GET" })
	.validator(z.object({ page: z.number().int().min(1), pageSize: z.number().int().min(1) }))
	.handler(async ({ data }) => {
		const res = await apiRequest<Transaction[]>("/transactions/trash", {
			query: { limit: data.pageSize, offset: (data.page - 1) * data.pageSize },
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: {
				items: res.data,
				total: res.total ?? res.data.length,
			} satisfies PageResult<Transaction>,
		};
	});

export const restoreTransactionFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Transaction>(`/transactions/${data.id}/restore`, { method: "POST" }),
	);

/** Deletes for good: only a transaction already in the trash. */
export const deleteTransactionPermanentlyFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<void>(`/transactions/${data.id}/permanent`, { method: "DELETE" }),
	);
