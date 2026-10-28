import { describe, expect, it } from "vitest";
import { defaultsToFill } from "./useVendorDefaults";

const vendor = {
	default_category: "Groceries",
	default_tags: [
		{ id: "1", name: "Weekly", color: "blue" },
		{ id: "2", name: "Need", color: "green" },
	],
};
const empty = { categoryText: "", tagNames: [], categoryVisible: true };

describe("defaultsToFill", () => {
	it("fills the category and tags when both are empty", () => {
		expect(defaultsToFill(vendor, empty)).toEqual({
			category: "Groceries",
			tags: ["Weekly", "Need"],
		});
	});

	it("keeps a category that was already typed", () => {
		expect(defaultsToFill(vendor, { ...empty, categoryText: "Fuel" })).toEqual({
			tags: ["Weekly", "Need"],
		});
		expect(defaultsToFill(vendor, { ...empty, categoryText: "  " }).category).toBe("Groceries");
	});

	it("keeps tags that were already chosen", () => {
		expect(defaultsToFill(vendor, { ...empty, tagNames: ["Trip"] })).toEqual({
			category: "Groceries",
		});
	});

	it("leaves the category alone when the items table replaces it", () => {
		expect(defaultsToFill(vendor, { ...empty, categoryVisible: false })).toEqual({
			tags: ["Weekly", "Need"],
		});
	});

	it("fills nothing for a vendor without defaults", () => {
		expect(defaultsToFill({ default_category: null, default_tags: [] }, empty)).toEqual({});
	});
});
