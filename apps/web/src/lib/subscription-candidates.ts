import type { IntervalUnit, SubscriptionCandidate } from "#/types/api";

const UNIT_WORD: Record<IntervalUnit, [string, string]> = {
	week: ["week", "weeks"],
	month: ["month", "months"],
	year: ["year", "years"],
};

/** "every month", "every 3 months", "every week": how often it repeats, in words. */
export function everyText(unit: IntervalUnit, count: number): string {
	const [one, many] = UNIT_WORD[unit];
	return count === 1 ? `every ${one}` : `every ${count} ${many}`;
}

/** How sure the pattern is, in words, never by colour alone. */
export const confidenceText = (c: Pick<SubscriptionCandidate, "confidence">) =>
	c.confidence === "high" ? "Looks regular" : "Looser fit";

/** The vendor and currency name a suggestion (both are needed: a vendor can be charged in two). */
export const candidateKey = (c: Pick<SubscriptionCandidate, "vendor_id" | "currency">) =>
	`${c.vendor_id}:${c.currency}`;

/** What the amount line says: a varying bill is "about", a steady one is exact. */
export const amountPrefix = (c: Pick<SubscriptionCandidate, "amount_varies">) =>
	c.amount_varies ? "about " : "";
