import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MarketRate } from "#/types/api";
import { apiRequest } from "./api";

/** The market rate for 1 `from` in `to` on a day, to suggest when entering a foreign amount. */
export const getMarketRateFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			from: z.string().regex(/^[A-Z]{3}$/),
			to: z.string().regex(/^[A-Z]{3}$/),
			on: z.iso.date(),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<MarketRate>("/currencies/rate", {
			query: { base: data.from, quote: data.to, on: data.on },
		}),
	);
