import type { Transaction } from "#/types/api";

/** Shared by the transaction table, its cards and the upcoming list, so all show the same facts. */
export function txTitle(t: Transaction) {
	return t.type === "transfer"
		? `${t.account?.name ?? "Deleted account"} → ${t.to_account?.name ?? "Deleted account"}`
		: (t.vendor?.name ?? (t.splits.length > 1 ? "Split purchase" : t.category));
}

/** The category, or every category a split transaction touches. */
export function txCategories(t: Transaction) {
	return t.splits.length > 1
		? [...new Set(t.splits.map((s) => s.category))].join(", ")
		: t.category;
}

export function txSubtitle(t: Transaction) {
	return (
		t.type === "transfer"
			? [t.description]
			: [t.vendor || t.splits.length > 1 ? txCategories(t) : null, t.description]
	)
		.filter(Boolean)
		.join(" · ");
}
