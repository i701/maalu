import { useState } from "react";
import type { Vendor } from "#/types/api";
import type { TransactionSeed } from "./request";

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** What a vendor's defaults add to the form right now: the category when that field is visible and
 * empty, the tags when there are none yet. Anything already typed is kept. */
export function defaultsToFill(
	vendor: Pick<Vendor, "default_category" | "default_tags">,
	form: { categoryText: string; tagNames: string[]; categoryVisible: boolean },
): { category?: string; tags?: string[] } {
	const fill: { category?: string; tags?: string[] } = {};
	if (form.categoryVisible && vendor.default_category && form.categoryText.trim() === "")
		fill.category = vendor.default_category;
	if (vendor.default_tags.length > 0 && form.tagNames.length === 0)
		fill.tags = vendor.default_tags.map((t) => t.name);
	return fill;
}

/**
 * Picking a vendor fills in the category and tags it usually gets, but only the ones still empty:
 * what you already typed is never overwritten, and nothing happens when the form merely opens
 * (editing a transaction, duplicating one, choosing a template).
 *
 * The category and tag fields are uncontrolled, so this tracks what they hold and refills one by
 * remounting it with a new `key` and default. `reset` follows the form being refilled from a seed.
 */
export function useVendorDefaults(
	vendors: Vendor[],
	start: TransactionSeed | undefined,
	/** False while the items table replaces the category field. */
	categoryVisible: boolean,
) {
	const startCategory = start && start.type !== "transfer" ? start.category : "";
	const startTags = start?.tags ?? [];
	const [category, setCategory] = useState({ text: startCategory, initial: startCategory, key: 0 });
	const [tags, setTags] = useState({ names: startTags, initial: startTags, key: 0 });

	/** `fromUser`: typed or picked, as opposed to the field setting its own starting value. */
	function onVendorChange(name: string, fromUser: boolean) {
		if (!fromUser) return;
		const vendor = vendors.find((v) => norm(v.name) === norm(name));
		if (!vendor) return;
		const fill = defaultsToFill(vendor, {
			categoryText: category.text,
			tagNames: tags.names,
			categoryVisible,
		});
		const { category: usualCategory, tags: usualTags } = fill;
		if (usualCategory !== undefined)
			setCategory((c) => ({ text: usualCategory, initial: usualCategory, key: c.key + 1 }));
		if (usualTags !== undefined)
			setTags((t) => ({ names: usualTags, initial: usualTags, key: t.key + 1 }));
	}

	function reset(next: TransactionSeed) {
		const nextCategory = next.type !== "transfer" ? next.category : "";
		setCategory((c) => ({ text: nextCategory, initial: nextCategory, key: c.key + 1 }));
		setTags((t) => ({ names: next.tags, initial: next.tags, key: t.key + 1 }));
	}

	return {
		categoryDefault: category.initial,
		categoryKey: category.key,
		onCategoryChange: (text: string) => setCategory((c) => ({ ...c, text })),
		tagsDefault: tags.initial,
		tagsKey: tags.key,
		onTagsChange: (names: string[]) => setTags((t) => ({ ...t, names })),
		onVendorChange,
		reset,
	};
}
