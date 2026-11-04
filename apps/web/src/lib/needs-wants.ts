import type { Category, CategoryKind, CategoryTotal } from "#/types/api";
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
