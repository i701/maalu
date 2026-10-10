import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageResult } from "#/lib/pagination";
import { VENDOR_LOCALITIES, type Vendor } from "#/types/api";
import { apiRequest } from "./api";

const currency = z
	.string()
	.regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code")
	.nullable();

const vendorFields = {
	address: z.string().max(500).nullable(),
	is_local: z.boolean().nullable(),
	currency,
	contact: z.string().max(255).nullable(),
};

const createSchema = z.object({
	name: z.string().trim().min(1).max(200),
	...vendorFields,
});
const updateSchema = z.object({
	id: z.uuid(),
	changes: createSchema.partial(),
});

export const listVendorsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<Vendor[]>("/vendors"),
);

/** One page of vendors for the Vendors table. Use `listVendorsFn` when you need every vendor. */
export const listVendorsPageFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			page: z.number().int().min(1).default(1),
			pageSize: z
				.number()
				.int()
				.refine((v) => PAGE_SIZES.includes(v))
				.default(DEFAULT_PAGE_SIZE),
			q: z.string().max(100).optional(),
			locality: z.enum(VENDOR_LOCALITIES).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const res = await apiRequest<Vendor[]>("/vendors", {
			query: {
				limit: data.pageSize,
				offset: (data.page - 1) * data.pageSize,
				q: data.q,
				locality: data.locality,
			},
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: { items: res.data, total: res.total ?? res.data.length } satisfies PageResult<Vendor>,
		};
	});

/** Server-side search for pickers/autocompletes: matches name, contact and address. */
export const searchVendorsFn = createServerFn({ method: "GET" })
	.validator(z.object({ q: z.string().max(100).default("") }))
	.handler(async ({ data }) =>
		apiRequest<Vendor[]>("/vendors", { query: { q: data.q, limit: 20 } }),
	);

/** One vendor by id, to show the selected value of an autocomplete. */
export const getVendorFn = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<Vendor>(`/vendors/${data.id}`));

export const createVendorFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) => apiRequest<Vendor>("/vendors", { method: "POST", body: data }));

export const updateVendorFn = createServerFn({ method: "POST" })
	.validator(updateSchema)
	.handler(async ({ data }) =>
		apiRequest<Vendor>(`/vendors/${data.id}`, { method: "PATCH", body: data.changes }),
	);

export const deleteVendorFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/vendors/${data.id}`, { method: "DELETE" }));
