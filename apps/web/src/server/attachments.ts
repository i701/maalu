import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Attachment, TransactionLink } from "#/types/api";
import { apiRequest } from "./api";

/** The files attached to a transaction, oldest first. */
export const listAttachmentsFn = createServerFn({ method: "GET" })
	.validator(z.object({ transaction_id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<Attachment[]>(`/transactions/${data.transaction_id}/attachments`),
	);

/** The web links attached to a transaction, oldest first. */
export const listLinksFn = createServerFn({ method: "GET" })
	.validator(z.object({ transaction_id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<TransactionLink[]>(`/transactions/${data.transaction_id}/links`),
	);

export const addLinkFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			transaction_id: z.uuid(),
			url: z.string().trim().min(1).max(2000),
			title: z.string().trim().max(200).nullish(),
		}),
	)
	.handler(async ({ data: { transaction_id, ...body } }) =>
		apiRequest<TransactionLink>(`/transactions/${transaction_id}/links`, {
			method: "POST",
			body,
		}),
	);

export const deleteLinkFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/links/${data.id}`, { method: "DELETE" }));
