import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Goal } from "#/types/api";
import { apiRequest } from "./api";

const money = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a valid positive amount (max 4 decimals)")
	.refine((v) => Number(v) > 0, "The amount must be greater than 0");

const fields = {
	name: z.string().trim().min(1).max(200),
	target_amount: money,
};

/** Every goal; `on` is any day in the budget period to report the monthly plan for. */
export const listGoalsFn = createServerFn({ method: "GET" })
	.validator(z.object({ on: z.iso.date().optional() }))
	.handler(async ({ data }) => apiRequest<Goal[]>("/goals", { query: { on: data.on } }));

export const createGoalFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			...fields,
			target_date: z.iso.date().optional(),
			monthly_amount: money.optional(),
			account_id: z.uuid().optional(),
		}),
	)
	.handler(async ({ data }) => apiRequest<Goal>("/goals", { method: "POST", body: data }));

export const updateGoalFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			changes: z.object({
				...fields,
				// explicit null clears them
				target_date: z.iso.date().nullable(),
				monthly_amount: money.nullable(),
				account_id: z.uuid().nullable(),
			}),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<Goal>(`/goals/${data.id}`, { method: "PATCH", body: data.changes }),
	);

export const deleteGoalFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/goals/${data.id}`, { method: "DELETE" }));

/** Set money aside (positive) or take it back out (negative). */
export const addGoalEntryFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Enter a valid amount"),
			entry_date: z.iso.date().optional(),
			note: z.string().max(200).optional(),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<Goal>(`/goals/${data.id}/entries`, {
			method: "POST",
			body: { amount: data.amount, entry_date: data.entry_date, note: data.note },
		}),
	);

export const deleteGoalEntryFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), entry_id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Goal>(`/goals/${data.id}/entries/${data.entry_id}`, { method: "DELETE" }),
	);
