import type { Category, CategoryKind, CategoryMonthRow, CategoryTotal } from "#/types/api";
import type { CompareRow } from "./compare";
import { percentChange } from "./dashboard";
import { sumDecimals } from "./format";

/** A category's kind, or "unsorted" when it has none yet. */
export type KindKey = CategoryKind | "unsorted";

export const KIND_ORDER: KindKey[] = ["need", "want", "unsorted"];

export const KIND_NAMES: Record<KindKey, string> = {
	need: "Needs",
	want: "Wants",
	unsorted: "Not sorted",
};

export type KindShare = {
	kind: KindKey;
	/** Spending in the base currency, exact (refunds already taken off) */
	total: string;
	/** Its part of the spending that went somewhere (zero or more, never above one) */
	share: number;
	/** How many categories it covers */
	categories: number;
};

/**
 * How the period's spending divides into needs, wants and what is not sorted yet. It reads the
 * category totals the dashboard already has, whose `kind` is the category's own or its parent's.
 * A kind that came to nothing or below (refunds past spending) has no share, so the shares of the
 * rest still add up to one. Null when nothing was spent.
 */
export function kindShares(categories: CategoryTotal[]): KindShare[] | null {
	const spending = categories.filter((c) => c.type === "expense");
	const rows = KIND_ORDER.map((kind) => {
		const mine = spending.filter((c) => (c.kind ?? "unsorted") === kind);
		return { kind, total: sumDecimals(mine.map((c) => c.total)), categories: mine.length };
	});
	const positive = rows.map((r) => Math.max(0, Number(r.total)));
	const sum = positive.reduce((a, b) => a + b, 0);
	if (sum === 0) return null;
	return rows.map((r, i) => ({ ...r, share: positive[i] / sum }));
}

/** The categories (parents first, as the API lists them) that still have no kind of their own and
 * take none from a parent. The default Salary category is pay, not spending, so it is left out. */
export const unsortedCategories = (categories: Category[]): Category[] =>
	categories.filter((c) => c.effective_kind == null && !c.is_salary);

/** The colour each kind wears wherever the split is drawn. Not sorted is a neutral, so it never reads as a third kind of spending. */
export const KIND_COLOR: Record<KindKey, string> = {
	need: "var(--chart-line)",
	want: "var(--chart-expense)",
	unsorted: "var(--md-sys-color-outline-variant)",
};

/**
 * Needs, wants and not sorted held across two periods, as rows the Compare table can draw (the
 * kind stands in for the category). A kind with nothing in either period is left out.
 */
export function compareKinds(before: CategoryTotal[], now: CategoryTotal[]): CompareRow[] {
	const sum = (cats: CategoryTotal[], kind: KindKey) =>
		sumDecimals(
			cats
				.filter((c) => c.type === "expense" && (c.kind ?? "unsorted") === kind)
				.map((c) => c.total),
		);
	return KIND_ORDER.flatMap((kind) => {
		const [b, n] = [sum(before, kind), sum(now, kind)];
		if (Number(b) === 0 && Number(n) === 0) return [];
		const change = sumDecimals([n, `-${b}`]);
		return [
			{
				categoryId: kind,
				category: KIND_NAMES[kind],
				parent: null,
				color: KIND_COLOR[kind],
				state: Number(b) === 0 ? "new" : Number(n) === 0 ? "gone" : "both",
				before: b,
				now: n,
				change,
				percent: percentChange(n, b),
			} satisfies CompareRow,
		];
	});
}

export type KindMonth = { kind: KindKey; amounts: string[]; total: string };

/** Spending by month split into needs, wants and not sorted, added up exactly from the category rows. */
export function kindMonths(rows: CategoryMonthRow[], monthCount: number): KindMonth[] {
	return KIND_ORDER.flatMap((kind) => {
		const mine = rows.filter((r) => r.type === "expense" && (r.kind ?? "unsorted") === kind);
		if (mine.length === 0) return [];
		const amounts = Array.from({ length: monthCount }, (_, i) =>
			sumDecimals(mine.map((r) => r.amounts[i])),
		);
		return [{ kind, amounts, total: sumDecimals(amounts) }];
	});
}
