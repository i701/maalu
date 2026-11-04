import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AvailableToSpend, BalanceTrend, MonthlyStats, NetWorthDrivers } from "#/types/api";
import { apiRequest } from "./api";

/** Income and expense per calendar month, ending with the month containing `to`. */
export const getMonthlyStatsFn = createServerFn({ method: "GET" })
	.validator(z.object({ months: z.number().int().min(1).max(24), to: z.iso.date() }))
	.handler(async ({ data }) =>
		apiRequest<MonthlyStats>("/stats/monthly", { query: { months: data.months, to: data.to } }),
	);

/** What the accounts were worth at the end of each day from `from` to `to`. */
export const getBalanceTrendFn = createServerFn({ method: "GET" })
	.validator(z.object({ from: z.iso.date(), to: z.iso.date() }))
	.handler(async ({ data }) =>
		apiRequest<BalanceTrend>("/stats/balance-trend", { query: { from: data.from, to: data.to } }),
	);

/** How net worth moved between two days and what moved it. */
export const getNetWorthDriversFn = createServerFn({ method: "GET" })
	.validator(z.object({ from: z.iso.date(), to: z.iso.date() }))
	.handler(async ({ data }) =>
		apiRequest<NetWorthDrivers>("/stats/net-worth-drivers", {
			query: { from: data.from, to: data.to },
		}),
	);

/** What can be spent until the end of the budget period, with the working behind it. */
export const getAvailableToSpendFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<AvailableToSpend>("/stats/available-to-spend"),
);
