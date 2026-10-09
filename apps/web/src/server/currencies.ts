import { createServerFn } from "@tanstack/react-start";
import { COMMON_CURRENCIES } from "#/lib/format";
import { apiRequest } from "./api";

/** World currency codes from the API. Never fails: falls back to a short built-in list. */
export const listCurrenciesFn = createServerFn({ method: "GET" }).handler(async () => {
	const res = await apiRequest<{ currencies: string[] }>("/currencies", { anonymous: true });
	return res.ok && res.data.currencies.length > 0 ? res.data.currencies : COMMON_CURRENCIES;
});
