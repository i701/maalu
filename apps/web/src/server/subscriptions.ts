import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	INTERVAL_UNITS,
	PAYMENT_METHODS,
	SUBSCRIPTION_STATUSES,
	type Subscription,
	type SubscriptionSummary,
} from "#/types/api";
import { apiRequest } from "./api";

// Decimals are validated as strings and forwarded untouched: no float round-trip.
const cost = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a valid positive amount (max 4 decimals)")
	.refine((v) => Number(v) > 0, "Amount must be greater than 0");
const exchangeRate = z
	.string()
	.regex(/^\d+(\.\d{1,8})?$/, "Enter a valid rate (max 8 decimals)")
	.refine((v) => Number(v) > 0, "Rate must be greater than 0");
const currency = z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code");
const name = z.string().trim().min(1).max(200);
const intervalCount = z.number().int().min(1).max(120);

const createSchema = z.object({
	name,
	amount: cost,
	currency: currency.optional(),
	exchange_rate: exchangeRate.optional(),
	payment_method: z.enum(PAYMENT_METHODS),
	category: z.string().trim().min(1).max(100),
	interval_unit: z.enum(INTERVAL_UNITS),
	interval_count: intervalCount,
	start_date: z.iso.date(),
	status: z.enum(SUBSCRIPTION_STATUSES).optional(),
	vendor_name: name.optional(),
});

const updateSchema = z.object({
	id: z.uuid(),
	changes: createSchema.omit({ vendor_name: true }).partial().extend({
		vendor_name: name.optional(),
		vendor_id: z.null().optional(), // explicit null unlinks the vendor
	}),
});

export const listSubscriptionsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<Subscription[]>("/subscriptions"),
);

export const getSubscriptionSummaryFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<SubscriptionSummary>("/subscriptions/summary"),
);

export const createSubscriptionFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) =>
		apiRequest<Subscription>("/subscriptions", { method: "POST", body: data }),
	);

export const updateSubscriptionFn = createServerFn({ method: "POST" })
	.validator(updateSchema)
	.handler(async ({ data }) =>
		apiRequest<Subscription>(`/subscriptions/${data.id}`, {
			method: "PATCH",
			body: data.changes,
		}),
	);

export const deleteSubscriptionFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/subscriptions/${data.id}`, { method: "DELETE" }));

/** Turn an existing transaction into a subscription and link it. */
export const createSubscriptionFromTransactionFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			transaction_id: z.uuid(),
			name: name.optional(),
			interval_unit: z.enum(INTERVAL_UNITS),
			interval_count: intervalCount,
		}),
	)
	.handler(async ({ data }) => {
		const { transaction_id, ...body } = data;
		return apiRequest<Subscription>(`/subscriptions/from-transaction/${transaction_id}`, {
			method: "POST",
			body,
		});
	});
