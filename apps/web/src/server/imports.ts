import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageResult } from "#/lib/pagination";
import { PAYMENT_METHODS, type BulkResult, type ImportBatch, type ImportResult } from "#/types/api";
import { apiRequest } from "./api";

const row = z.object({
	date: z.iso.date(),
	time: z.string().nullable().optional(),
	type: z.enum(["income", "expense"]),
	amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
	description: z.string().max(1000).nullable().optional(),
	reference: z.string().max(100).nullable().optional(),
	counterparty: z.string().max(200),
	payment_method: z.enum(PAYMENT_METHODS),
	vendor_name: z.string().trim().min(1).max(200).optional(),
	category: z.string().trim().min(1).max(100).optional(),
	tags: z.array(z.string().max(50)).max(10).optional(),
	transfer_account_id: z.uuid().optional(),
	skip: z.boolean(),
});

/** Create the confirmed rows as one batch. The API reports rows it could not make instead of
 * failing, so a partly bad file still imports what it can. */
export const importRowsFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			account_id: z.uuid(),
			filename: z.string().trim().min(1).max(255),
			profile: z.string().max(32),
			rows: z.array(row).min(1).max(2000),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<ImportResult>("/imports", { method: "POST", body: data }),
	);

/** One page of earlier imports, newest first. */
export const listImportsPageFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			page: z.number().int().min(1).default(1),
			pageSize: z
				.number()
				.int()
				.refine((v) => PAGE_SIZES.includes(v))
				.default(DEFAULT_PAGE_SIZE),
		}),
	)
	.handler(async ({ data }) => {
		const res = await apiRequest<ImportBatch[]>("/imports", {
			query: { limit: data.pageSize, offset: (data.page - 1) * data.pageSize },
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: {
				items: res.data,
				total: res.total ?? res.data.length,
			} satisfies PageResult<ImportBatch>,
		};
	});

/** Undo an import: what it made goes to the trash. */
export const undoImportFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<BulkResult>(`/imports/${data.id}`, { method: "DELETE" }));
