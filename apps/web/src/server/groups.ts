import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageResult } from "#/lib/pagination";
import type { GroupDetail, GroupRemoved, TransactionGroup } from "#/types/api";
import { apiRequest } from "./api";

const name = z.string().trim().min(1).max(100);
const note = z.string().trim().max(500).nullish();
const ids = z.array(z.uuid()).min(1).max(50);

/** Every group, for the picker that adds transactions to an existing one. */
export const listGroupsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<TransactionGroup[]>("/groups"),
);

/** One page of groups for the Groups table. */
export const listGroupsPageFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			page: z.number().int().min(1).default(1),
			pageSize: z
				.number()
				.int()
				.refine((v) => PAGE_SIZES.includes(v))
				.default(DEFAULT_PAGE_SIZE),
			q: z.string().max(100).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const res = await apiRequest<TransactionGroup[]>("/groups", {
			query: { limit: data.pageSize, offset: (data.page - 1) * data.pageSize, q: data.q },
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: {
				items: res.data,
				total: res.total ?? res.data.length,
			} satisfies PageResult<TransactionGroup>,
		};
	});

/** A group with its summary and the transactions in it. */
export const getGroupFn = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<GroupDetail>(`/groups/${data.id}`));

export const createGroupFn = createServerFn({ method: "POST" })
	.validator(z.object({ name, note, transaction_ids: z.array(z.uuid()).min(2).max(50) }))
	.handler(async ({ data }) =>
		apiRequest<TransactionGroup>("/groups", { method: "POST", body: data }),
	);

export const updateGroupFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), changes: z.object({ name: name.optional(), note }) }))
	.handler(async ({ data }) =>
		apiRequest<TransactionGroup>(`/groups/${data.id}`, { method: "PATCH", body: data.changes }),
	);

export const deleteGroupFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/groups/${data.id}`, { method: "DELETE" }));

export const addToGroupFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), transaction_ids: ids }))
	.handler(async ({ data }) =>
		apiRequest<TransactionGroup>(`/groups/${data.id}/transactions`, {
			method: "POST",
			body: { transaction_ids: data.transaction_ids },
		}),
	);

export const removeFromGroupFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), transaction_ids: ids }))
	.handler(async ({ data }) =>
		apiRequest<GroupRemoved>(`/groups/${data.id}/transactions/remove`, {
			method: "POST",
			body: { transaction_ids: data.transaction_ids },
		}),
	);
