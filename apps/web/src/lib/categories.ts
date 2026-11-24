import { ACCENT, isAccent } from "#/lib/m3";
import type { Category, CategoryTotal } from "#/types/api";
import { sumDecimals } from "./format";

/** The colour names a category can have, in the palette's order (the API's `ACCENT_COLORS`). */
export const ACCENT_NAMES = Object.keys(ACCENT).filter(isAccent);

/** A category's colour is one of the accent names, picked by the API; anything else reads as grey. */
export const categoryAccent = (color: string | null | undefined): string =>
	isAccent(color) ? ACCENT[color] : ACCENT.slate;

/** "Food › Groceries" for a sub-category, just the name for any other. */
export const categoryPath = (c: Pick<Category, "name" | "parent">): string =>
	c.parent ? `${c.parent} › ${c.name}` : c.name;

/**
 * The categories `self` may sit under: top-level ones other than itself. The tree is one level, so
 * a category that has sub-categories of its own cannot become one.
 */
export function parentChoices(categories: Category[], self?: Category): Category[] {
	if (self && self.child_count > 0) return [];
	return categories.filter((c) => !c.parent_id && c.id !== self?.id);
}

/** What a category spent in a period: its own, and with its sub-categories (the tree is one level). */
export type CategorySpend = {
	own: string;
	/** Its own plus its sub-categories', the figure a parent row shows */
	withChildren: string;
	/** Whether a sub-category added anything to `withChildren` */
	fromChildren: boolean;
};

/**
 * Spending per category id from the period's category totals (refunds already taken off, exact
 * decimals). A parent also gets its sub-categories' spending, so its row is the whole of "Food". A
 * category with no spending in the period has no entry.
 */
export function spendByCategory(totals: readonly CategoryTotal[]): Map<string, CategorySpend> {
	const expenses = totals.filter((t) => t.type === "expense");
	const fromSubs = new Map<string, string[]>();
	for (const t of expenses) {
		if (t.parent_id) fromSubs.set(t.parent_id, [...(fromSubs.get(t.parent_id) ?? []), t.total]);
	}
	const spend = new Map<string, CategorySpend>();
	const add = (id: string, own: string) => {
		const subs = fromSubs.get(id) ?? [];
		spend.set(id, {
			own,
			withChildren: sumDecimals([own, ...subs]),
			fromChildren: subs.length > 0,
		});
	};
	for (const t of expenses) add(t.category_id, t.total);
	// a parent with nothing booked to it, only to its sub-categories, still has a figure
	for (const id of fromSubs.keys()) if (!spend.has(id)) add(id, "0");
	return spend;
}
