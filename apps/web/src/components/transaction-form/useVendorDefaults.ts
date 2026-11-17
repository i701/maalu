import { useState } from "react";
import type { Vendor } from "#/types/api";
import type { UseFormReturn } from "react-hook-form";
import type { TxValues } from "./schema";

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
 * The category and tag pickers only read their starting value, so a filled-in one is remounted
 * with a new `key` to show it.
 */
export function useVendorDefaults(
	vendors: Vendor[],
	{ getValues, setValue }: Pick<UseFormReturn<TxValues>, "getValues" | "setValue">,
	/** False while the items table replaces the category field. */
	categoryVisible: boolean,
) {
	const [keys, setKeys] = useState({ category: 0, tags: 0 });

	/** `fromUser`: typed or picked, as opposed to the field setting its own starting value. */
	function onVendorChange(name: string, fromUser: boolean) {
		if (!fromUser) return;
		const vendor = vendors.find((v) => norm(v.name) === norm(name));
		if (!vendor) return;
		const fill = defaultsToFill(vendor, {
			categoryText: getValues("category"),
			tagNames: getValues("tags"),
			categoryVisible,
		});
		const { category, tags } = fill;
		if (category !== undefined) setValue("category", category);
		if (tags !== undefined) setValue("tags", tags);
		setKeys((k) => ({
			category: k.category + (category === undefined ? 0 : 1),
			tags: k.tags + (tags === undefined ? 0 : 1),
		}));
	}

	return { categoryKey: keys.category, tagsKey: keys.tags, onVendorChange };
}
