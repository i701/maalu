import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Card } from "#/types/api";
import { apiRequest } from "./api";

const digits = z
	.string()
	.trim()
	.regex(/^\d{4}$/, "Enter the last four digits only");

/** Every card, or the ones tied to an account. */
export const listCardsFn = createServerFn({ method: "GET" })
	.validator(z.object({ account_id: z.uuid().optional() }).optional())
	.handler(async ({ data }) =>
		apiRequest<Card[]>("/cards", { query: { account_id: data?.account_id } }),
	);

const fields = {
	name: z.string().trim().min(1, "Give the card a name").max(100),
	kind: z.enum(["debit", "credit"]),
	last_digits: digits.optional(),
	account_id: z.uuid(),
	repay_account_id: z.uuid().optional(),
};

export const createCardFn = createServerFn({ method: "POST" })
	.validator(z.object(fields))
	.handler(async ({ data }) => apiRequest<Card>("/cards", { method: "POST", body: data }));

export const updateCardFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			changes: z.object({
				name: fields.name.optional(),
				last_digits: digits.nullable().optional(),
				account_id: z.uuid().optional(),
				repay_account_id: z.uuid().nullable().optional(),
			}),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<Card>(`/cards/${data.id}`, { method: "PATCH", body: data.changes }),
	);

export const deleteCardFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/cards/${data.id}`, { method: "DELETE" }));
