import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PageResult } from "#/lib/pagination";
import { PAYMENT_METHODS, TRANSACTION_TYPES, type TransactionTemplate } from "#/types/api";
import { apiRequest } from "./api";

const amount = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a valid positive amount (max 4 decimals)")
	.refine((v) => Number(v) > 0, "Amount must be greater than 0");

const name = z.string().trim().min(1, "Give the template a name").max(200);

const createSchema = z.object({
	name,
	type: z.enum(TRANSACTION_TYPES),
	amount: amount.optional(),
	payment_method: z.enum(PAYMENT_METHODS).optional(),
	category: z.string().trim().min(1).max(100).optional(),
	vendor_name: z.string().trim().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	account_id: z.uuid().optional(),
	to_account_id: z.uuid().optional(),
	currency: z
		.string()
		.regex(/^[A-Za-z]{3}$/)
		.optional(),
});

export type TemplateDraft = z.infer<typeof createSchema>;

export const listTemplatesFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<TransactionTemplate[]>("/templates"),
);

/** One page of templates, for the Templates page. */
export const listTemplatesPageFn = createServerFn({ method: "GET" })
	.validator(z.object({ page: z.number().int().min(1), pageSize: z.number().int().min(1) }))
	.handler(async ({ data }) => {
		const res = await apiRequest<TransactionTemplate[]>("/templates", {
			query: { limit: data.pageSize, offset: (data.page - 1) * data.pageSize },
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: {
				items: res.data,
				total: res.total ?? res.data.length,
			} satisfies PageResult<TransactionTemplate>,
		};
	});

export const createTemplateFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) =>
		apiRequest<TransactionTemplate>("/templates", { method: "POST", body: data }),
	);

export const renameTemplateFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), name }))
	.handler(async ({ data }) =>
		apiRequest<TransactionTemplate>(`/templates/${data.id}`, {
			method: "PATCH",
			body: { name: data.name },
		}),
	);

export const deleteTemplateFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/templates/${data.id}`, { method: "DELETE" }));
