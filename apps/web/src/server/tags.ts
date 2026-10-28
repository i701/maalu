import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageResult } from "#/lib/pagination";
import type { Tag } from "#/types/api";
import { apiRequest } from "./api";

const name = z.string().trim().min(1, "Give the tag a name").max(50);

/** Every tag, for pickers. */
export const listTagsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<Tag[]>("/tags"),
);

/** One page of tags for the Tags table. */
export const listTagsPageFn = createServerFn({ method: "GET" })
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
		const res = await apiRequest<Tag[]>("/tags", {
			query: { limit: data.pageSize, offset: (data.page - 1) * data.pageSize, q: data.q },
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: { items: res.data, total: res.total ?? res.data.length } satisfies PageResult<Tag>,
		};
	});

export const createTagFn = createServerFn({ method: "POST" })
	.validator(z.object({ name }))
	.handler(async ({ data }) => apiRequest<Tag>("/tags", { method: "POST", body: data }));

export const renameTagFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), name }))
	.handler(async ({ data }) =>
		apiRequest<Tag>(`/tags/${data.id}`, { method: "PATCH", body: { name: data.name } }),
	);

export const mergeTagFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), into_id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Tag>(`/tags/${data.id}/merge`, { method: "POST", body: { into_id: data.into_id } }),
	);

export const deleteTagFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/tags/${data.id}`, { method: "DELETE" }));
