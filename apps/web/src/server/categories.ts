import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageResult } from "#/lib/pagination";
import { ACCENT_NAMES } from "#/lib/categories";
import type { Category } from "#/types/api";
import { apiRequest } from "./api";

const name = z.string().trim().min(1).max(100);

/** Every category, for pickers. */
export const listCategoriesFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<Category[]>("/categories"),
);

/** One page of categories for the Categories table. */
export const listCategoriesPageFn = createServerFn({ method: "GET" })
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
		const res = await apiRequest<Category[]>("/categories", {
			query: { limit: data.pageSize, offset: (data.page - 1) * data.pageSize, q: data.q },
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: { items: res.data, total: res.total ?? res.data.length } satisfies PageResult<Category>,
		};
	});

/** Server-side search for the filter autocomplete. */
export const searchCategoriesFn = createServerFn({ method: "GET" })
	.validator(z.object({ q: z.string().max(100).default("") }))
	.handler(async ({ data }) =>
		apiRequest<Category[]>("/categories", { query: { q: data.q, limit: 20 } }),
	);

/** One category by id, to show the selected value of the filter. */
export const getCategoryFn = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<Category>(`/categories/${data.id}`));

const color = z.enum(ACCENT_NAMES);

export const createCategoryFn = createServerFn({ method: "POST" })
	.validator(z.object({ name, color: color.optional(), parent_id: z.uuid().nullish() }))
	.handler(async ({ data }) => apiRequest<Category>("/categories", { method: "POST", body: data }));

/** Change a category: only the fields sent change, and `parent_id: null` makes it a top-level one. */
export const updateCategoryFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			name: name.optional(),
			color: color.optional(),
			parent_id: z.uuid().nullish(),
		}),
	)
	.handler(async ({ data: { id, ...body } }) =>
		apiRequest<Category>(`/categories/${id}`, { method: "PATCH", body }),
	);

export const mergeCategoryFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid(), into_id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Category>(`/categories/${data.id}/merge`, {
			method: "POST",
			body: { into_id: data.into_id },
		}),
	);

export const deleteCategoryFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/categories/${data.id}`, { method: "DELETE" }));
