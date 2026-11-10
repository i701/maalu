import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageResult } from "#/lib/pagination";
import type { AppNotification, EmailStatus } from "#/types/api";
import { apiRequest } from "./api";

/** How many are unread, for the badge on the bell (the API also looks for new ones, at most every
 * few minutes). A failure counts as none: the bell must never break a page. */
export const unreadCountFn = createServerFn({ method: "GET" }).handler(async () => {
	const res = await apiRequest<{ count: number }>("/notifications/unread-count");
	return res.ok ? res.data.count : 0;
});

/** The few newest, for the bell's popover. */
export const listRecentNotificationsFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<AppNotification[]>("/notifications", { query: { limit: 8 } }),
);

/** One page for the Notifications page, optionally only the unread. */
export const listNotificationsPageFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			page: z.number().int().min(1).default(1),
			pageSize: z
				.number()
				.int()
				.refine((v) => PAGE_SIZES.includes(v))
				.default(DEFAULT_PAGE_SIZE),
			unread: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const res = await apiRequest<AppNotification[]>("/notifications", {
			query: {
				limit: data.pageSize,
				offset: (data.page - 1) * data.pageSize,
				unread: data.unread ? "true" : undefined,
			},
		});
		if (!res.ok) return res;
		return {
			ok: true as const,
			data: {
				items: res.data,
				total: res.total ?? res.data.length,
			} satisfies PageResult<AppNotification>,
		};
	});

export const markNotificationReadFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<AppNotification>(`/notifications/${data.id}/read`, { method: "POST" }),
	);

export const markAllNotificationsReadFn = createServerFn({ method: "POST" }).handler(async () =>
	apiRequest<{ count: number }>("/notifications/read-all", { method: "POST" }),
);

export const dismissNotificationFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/notifications/${data.id}`, { method: "DELETE" }));

/** Whether the server can send email (its SMTP settings are the operator's). */
export const emailStatusFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<EmailStatus>("/email/status"),
);

/** Send a test message to the signed-in address; a failure carries the provider's own reason. */
export const sendTestEmailFn = createServerFn({ method: "POST" }).handler(async () =>
	apiRequest<void>("/email/test", { method: "POST" }),
);
