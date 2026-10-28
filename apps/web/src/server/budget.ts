import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Budget } from "#/types/api";
import { apiRequest } from "./api";

const limit = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a valid positive amount (max 4 decimals)")
	.refine((v) => Number(v) > 0, "The limit must be greater than 0");
const warnPercent = z.number().int().min(1).max(100);

const lineFields = {
	name: z.string().trim().min(1).max(200),
	category_ids: z.array(z.uuid()).min(1, "Choose at least one category"),
	amount: limit,
	rollover: z.boolean(),
};

/** One budget period: any day in it picks the period (default: the current one). */
export const getBudgetFn = createServerFn({ method: "GET" })
	.validator(z.object({ on: z.iso.date().optional() }))
	.handler(async ({ data }) => apiRequest<Budget>("/budget", { query: { on: data.on } }));

export const updateBudgetFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			period_start_day: z.number().int().min(1).max(28).optional(),
			warn_percent: warnPercent.optional(),
		}),
	)
	.handler(async ({ data }) => apiRequest<Budget>("/budget", { method: "PATCH", body: data }));

export const createBudgetLineFn = createServerFn({ method: "POST" })
	.validator(z.object({ ...lineFields, warn_percent: warnPercent.optional() }))
	.handler(async ({ data }) => apiRequest<Budget>("/budget/lines", { method: "POST", body: data }));

export const updateBudgetLineFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			changes: z.object({
				...lineFields,
				warn_percent: warnPercent.nullable(), // null goes back to the budget's level
			}),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<Budget>(`/budget/lines/${data.id}`, { method: "PATCH", body: data.changes }),
	);

export const deleteBudgetLineFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/budget/lines/${data.id}`, { method: "DELETE" }));
