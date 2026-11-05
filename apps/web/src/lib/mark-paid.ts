import { divRound, fromScaled, pow10, toScaled } from "./decimal";

/** An amount in a bill's own currency times a rate, in the base currency: rounded half to even at
 * four decimals like the API, and null when either is not a number. */
export function baseOf(amount: string, rate: string): string | null {
	const a = toScaled(amount.trim(), 4);
	const r = toScaled(rate.trim(), 8);
	if (a === null || r === null) return null;
	return fromScaled(divRound(a * r, pow10(8)), 4);
}

/** Whether two rates are the same number, however they are written ("15.4" and "15.40000000"). */
export function sameRate(a: string, b: string): boolean {
	const x = toScaled(a.trim(), 8);
	const y = toScaled(b.trim(), 8);
	return x !== null && y !== null && x === y;
}

/**
 * What to send when a bill is marked as paid. The amount always goes. For a bill in another
 * currency, **what it really cost** in the base currency wins (the rate is worked out from it);
 * otherwise a rate that differs from the planned one goes, and an unchanged rate is left out so the
 * planned one stays.
 */
export function payBody({
	amount,
	foreign,
	rate,
	plannedRate,
	charged,
}: {
	amount: string;
	foreign: boolean;
	rate: string;
	plannedRate: string;
	charged: string;
}): { amount: string; exchange_rate?: string; base_amount?: string } {
	if (!foreign) return { amount };
	if (charged.trim() !== "") return { amount, base_amount: charged.trim() };
	if (rate.trim() !== "" && !sameRate(rate, plannedRate))
		return { amount, exchange_rate: rate.trim() };
	return { amount };
}
