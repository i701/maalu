import { useEffect, useState } from "react";
import { getMarketRateFn } from "#/server/rates";
import type { MarketRate } from "#/types/api";

export type MarketRateState = {
	/** The latest rate found; kept while the next lookup is running */
	market: MarketRate | null;
	/** idle: nothing to look up; loading: a lookup is pending; missing: the source has no rate for
	 * the pair; error: the source could not be reached */
	status: "idle" | "loading" | "ok" | "missing" | "error";
};

type Done = { key: string; market: MarketRate | null; status: "ok" | "missing" | "error" };

const CODE = /^[A-Z]{3}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Looks up the market rate for 1 `from` in `to` on a day, a moment after the inputs stop changing
 * (so typing a currency or a date doesn't fire a request per keystroke). An answer that arrives
 * for inputs that have since changed is dropped. The returned state is derived from the inputs and
 * the last finished lookup, so nothing is set while rendering.
 */
export function useMarketRate({
	from,
	to,
	on,
	enabled,
}: {
	from: string;
	to: string;
	on: string;
	enabled: boolean;
}): MarketRateState {
	const f = from.toUpperCase();
	const valid = enabled && CODE.test(f) && CODE.test(to) && f !== to && DAY.test(on);
	const key = `${f}>${to}@${on}`;
	const [done, setDone] = useState<Done | null>(null);

	useEffect(() => {
		if (!valid) return;
		let stale = false;
		const timer = setTimeout(async () => {
			const res = await getMarketRateFn({ data: { from: f, to, on } });
			if (stale) return;
			setDone(
				res.ok
					? { key, market: res.data, status: "ok" }
					: { key, market: null, status: res.status === 404 ? "missing" : "error" },
			);
		}, 350);
		return () => {
			stale = true;
			clearTimeout(timer);
		};
	}, [valid, key, f, to, on]);

	if (!valid) return { market: null, status: "idle" };
	if (done?.key === key) return { market: done.market, status: done.status };
	return { market: done?.market ?? null, status: "loading" };
}
