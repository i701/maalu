import { describe, expect, it } from "vitest";
import type { Category } from "#/types/api";
import { categoryAccent, categoryPath, parentChoices, spendByCategory } from "./categories";
import { ACCENT } from "./m3";
import { categoryTotal, makeCategory } from "#/test/fixtures";

const cat = (id: string, extra: Partial<Category> = {}): Category =>
	makeCategory({ id, name: id, color: "blue", ...extra });

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

const total = (category: string, amount: string, parent: string | null = null) =>
	categoryTotal({
		category,
		category_id: category,
		total: amount,
		parent,
		parent_id: parent,
	});

describe("spendByCategory", () => {
	it("gives a parent its own spending plus its sub-categories'", () => {
		const spend = spendByCategory([
			total("Food", "100.50"),
			total("Dining", "800", "Food"),
			total("Coffee", "300", "Food"),
			total("Rent", "3000"),
		]);
		expect(spend.get("Food")).toEqual({
			own: "100.50",
			withChildren: "1200.50",
			fromChildren: true,
		});
		expect(spend.get("Dining")?.withChildren).toBe("800.00");
		expect(spend.get("Rent")).toEqual({
			own: "3000",
			withChildren: "3000.00",
			fromChildren: false,
		});
	});

	it("gives a parent with nothing booked to it the sum of its sub-categories", () => {
		const spend = spendByCategory([total("Dining", "800", "Food")]);
		expect(spend.get("Food")).toEqual({ own: "0", withChildren: "800.00", fromChildren: true });
	});

	it("leaves out income and categories with no spending", () => {
		const spend = spendByCategory([
			categoryTotal({ category: "Pay", category_id: "Pay", type: "income", total: "999" }),
		]);
		expect(spend.size).toBe(0);
	});
});
