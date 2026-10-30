import { ACCENT, type Accent } from "#/lib/m3";
import type { Category } from "#/types/api";

/** The colour names a category can have, in the palette's order (the API's `ACCENT_COLORS`). */
export const ACCENT_NAMES = Object.keys(ACCENT) as [Accent, ...Accent[]];

/** A category's colour is one of the accent names, picked by the API; anything else reads as grey. */
export const categoryAccent = (color: string | null | undefined): string =>
	ACCENT[color as Accent] ?? ACCENT.slate;

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
