import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { COMMON_CURRENCIES } from "#/lib/format";
import type { RateHistory } from "#/types/api";
import { apiRequest } from "./api";

/** World currency codes from the API. Never fails: falls back to a short built-in list. */
export const listCurrenciesFn = createServerFn({ method: "GET" }).handler(async () => {
	const res = await apiRequest<{ currencies: string[] }>("/currencies", { anonymous: true });
	return res.ok && res.data.currencies.length > 0 ? res.data.currencies : COMMON_CURRENCIES;
});

/** How the market rate of one currency in another moved over the last few days. */
export const getRateHistoryFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			base: z.string().regex(/^[A-Za-z]{3}$/),
			quote: z.string().regex(/^[A-Za-z]{3}$/),
			days: z.number().int().min(7).max(365),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<RateHistory>("/currencies/rate-history", {
			query: { base: data.base.toUpperCase(), quote: data.quote.toUpperCase(), days: data.days },
		}),
	);
