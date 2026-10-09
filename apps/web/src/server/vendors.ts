import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Vendor } from "#/types/api";
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
