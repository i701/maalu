import { describe, expect, it } from "vitest";
import type { Category } from "#/types/api";
import { categoryAccent, categoryPath, parentChoices } from "./categories";
import { ACCENT } from "./m3";

const cat = (id: string, extra: Partial<Category> = {}): Category =>
	({
		id,
		name: id,
		color: "blue",
		child_count: 0,
		parent_id: null,
		parent: null,
		...extra,
	}) as Category;

describe("categoryAccent", () => {
	it("maps a name to its hex and anything else to grey", () => {
		expect(categoryAccent("pink")).toBe(ACCENT.pink);
		expect(categoryAccent("nope")).toBe(ACCENT.slate);
		expect(categoryAccent(null)).toBe(ACCENT.slate);
	});
});

describe("categoryPath", () => {
	it("prefixes the parent", () => {
		expect(categoryPath({ name: "Groceries", parent: "Food" })).toBe("Food › Groceries");
		expect(categoryPath({ name: "Food", parent: null })).toBe("Food");
	});
});

describe("parentChoices", () => {
	const food = cat("Food", { child_count: 1 });
	const groceries = cat("Groceries", { parent_id: "Food", parent: "Food" });
	const fuel = cat("Fuel");
	const all = [food, groceries, fuel];

	it("offers top-level categories only", () => {
		expect(parentChoices(all).map((c) => c.id)).toEqual(["Food", "Fuel"]);
	});
	it("leaves out the category itself", () => {
		expect(parentChoices(all, fuel).map((c) => c.id)).toEqual(["Food"]);
	});
	it("offers nothing to a category that has sub-categories", () => {
		expect(parentChoices(all, food)).toEqual([]);
	});
});
