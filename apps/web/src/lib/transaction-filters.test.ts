import { describe, expect, it, vi } from "vitest";
import {
	buildActiveFilters,
	countActiveFilters,
	hasAnyFilter,
	pickFilterValues,
	tagNamesOf,
} from "./transaction-filters";

const tags = [
	{ id: "a", name: "Trip" },
	{ id: "b", name: "Need" },
];

describe("tagNamesOf", () => {
	it("keeps the order of the ids and skips ones that no longer exist", () => {
		expect(tagNamesOf(["b", "gone", "a"], tags)).toEqual(["Need", "Trip"]);
		expect(tagNamesOf(undefined, tags)).toEqual([]);
	});
});

const chips = (filters: Parameters<typeof buildActiveFilters>[0]["filters"], patch = vi.fn()) =>
	buildActiveFilters({
		filters,
		selectedAccount: null,
		selectedVendor: null,
		selectedCategory: null,
		tagNames: ["Trip", "Need"],
		baseCurrency: "MVR",
		patch,
	});

describe("tag filters", () => {
	it("counts several tags as one filter", () => {
		expect(countActiveFilters({ tag_ids: ["a", "b"] })).toBe(1);
		expect(countActiveFilters({ tag_ids: ["a"], type: "expense" })).toBe(2);
		expect(countActiveFilters({})).toBe(0);
	});

	it("is a filter only when there are tags", () => {
		expect(hasAnyFilter({ tag_ids: ["a"] })).toBe(true);
		expect(hasAnyFilter({})).toBe(false);
		expect(pickFilterValues({ tag_ids: ["a"], tag_match: "all" })).toMatchObject({
			tag_ids: ["a"],
			tag_match: "all",
		});
	});

	it("shows one chip that reads 'or' for any and '+' for all", () => {
		expect(chips({ tag_ids: ["a", "b"] }).map((c) => c.label)).toEqual(["Tags: Trip or Need"]);
		expect(chips({ tag_ids: ["a", "b"], tag_match: "all" }).map((c) => c.label)).toEqual([
			"Tags: Trip + Need",
		]);
	});

	it("removes every tag at once", () => {
		const patch = vi.fn();
		chips({ tag_ids: ["a", "b"], tag_match: "all" }, patch)[0]?.onDelete();
		expect(patch).toHaveBeenCalledWith({ tag_ids: undefined, tag_match: undefined });
	});
});
