import { divRound, fromScaled, pow10, toScaled } from "./decimal";

/** How prices on a receipt relate to GST. */
export type TaxMode = "none" | "included" | "excluded";

/** One row of the split table, as typed (strings) plus any amount kept from a saved transaction. */
export type SplitRow = {
	key: string;
	name: string;
	quantity: string;
	/** Per-unit price as typed. */
	price: string;
	category: string;
	/** From a saved transaction: its exact line total and tax, used until quantity or price is edited. */
	locked?: { amount: string; tax: string | null };
};

export type LineAmount = { amount: string; tax: string | null };

const AMOUNT_SCALE = 4;
const QTY_SCALE = 3;
const RATE_SCALE = 4;

let counter = 0;
export const newRow = (partial: Partial<SplitRow> = {}): SplitRow => ({
	key: `row-${counter++}`,
	name: "",
	quantity: "1",
	price: "",
	category: "",
	...partial,
});

/** The line total (tax included) and the tax in it, or null while quantity or price is incomplete. */
export function lineAmount(row: SplitRow, mode: TaxMode, rate: string): LineAmount | null {
	if (row.locked) return row.locked;
	const qty = toScaled(row.quantity, QTY_SCALE);
	const price = toScaled(row.price, AMOUNT_SCALE);
	if (qty === null || price === null || qty === 0n || price === 0n) return null;
	// qty (3 decimals) x price (4 decimals) has 7; bring it back to 4.
	const base = divRound(qty * price, pow10(QTY_SCALE));
	const pct = mode === "none" ? 0n : toScaled(rate, RATE_SCALE);
	if (pct === null || pct === 0n) return { amount: fromScaled(base, AMOUNT_SCALE), tax: null };
	const hundred = 100n * pow10(RATE_SCALE);
	if (mode === "included") {
		const tax = divRound(base * pct, hundred + pct);
		return { amount: fromScaled(base, AMOUNT_SCALE), tax: fromScaled(tax, AMOUNT_SCALE) };
	}
	const tax = divRound(base * pct, hundred);
	return { amount: fromScaled(base + tax, AMOUNT_SCALE), tax: fromScaled(tax, AMOUNT_SCALE) };
}

/** Sum of the complete lines' totals. */
export function splitTotal(lines: (LineAmount | null)[]): string {
	let total = 0n;
	for (const l of lines) if (l) total += toScaled(l.amount, AMOUNT_SCALE) ?? 0n;
	return fromScaled(total, AMOUNT_SCALE);
}

/** Rows for a saved split transaction: totals are kept exactly; the unit price is shown for reference. */
export function rowsFromSplits(
	splits: {
		name: string;
		quantity: string;
		category: string;
		amount: string;
		tax_amount: string | null;
	}[],
): SplitRow[] {
	return splits.map((s) => {
		const qty = toScaled(s.quantity, QTY_SCALE);
		const amount = toScaled(s.amount, AMOUNT_SCALE);
		const unit =
			qty && amount !== null
				? fromScaled(divRound(amount * pow10(QTY_SCALE), qty), AMOUNT_SCALE)
				: s.amount;
		return newRow({
			name: s.name,
			quantity: fromScaled(qty ?? 100n, QTY_SCALE, 0),
			price: unit,
			category: s.category,
			locked: { amount: s.amount, tax: s.tax_amount },
		});
	});
}
