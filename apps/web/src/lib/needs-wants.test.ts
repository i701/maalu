import { describe, expect, it } from "vitest";
import type { Category, CategoryTotal } from "#/types/api";
import { kindShares, unsortedCategories } from "./needs-wants";

const cat = (
	category: string,
	total: string,
	kind: CategoryTotal["kind"] = null,
	type: CategoryTotal["type"] = "expense",
) => ({ type, category, total, kind }) as CategoryTotal;

describe("kindShares", () => {
	it("splits spending into needs, wants and not sorted", () => {
		const rows = kindShares([
			cat("Food", "300.10", "need"),
			cat("Rent", "100", "need"),
			cat("Games", "100", "want"),
			cat("Misc", "100", null),
		])!;
		expect(rows.map((r) => r.kind)).toEqual(["need", "want", "unsorted"]);
		expect(rows.map((r) => r.total)).toEqual(["400.10", "100.00", "100.00"]);
		expect(rows.map((r) => r.categories)).toEqual([2, 1, 1]);
		expect(rows[0].share).toBeCloseTo(400.1 / 600.1);
		expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1);
	});

	it("leaves income out", () => {
		const rows = kindShares([cat("Salary", "5000", "need", "income"), cat("Food", "50", "need")])!;
		expect(rows[0].total).toBe("50.00");
	});

	it("gives a kind that came to nothing or less no share", () => {
		const rows = kindShares([cat("Food", "100", "need"), cat("Refunded", "-20", "want")])!;
		expect(rows[1].total).toBe("-20.00");
		expect(rows[1].share).toBe(0);
		expect(rows[0].share).toBe(1);
	});

	it("is null when nothing was spent", () => {
		expect(kindShares([])).toBeNull();
		expect(kindShares([cat("Food", "0", "need")])).toBeNull();
		expect(kindShares([cat("Salary", "10", null, "income")])).toBeNull();
	});
});

const named = (name: string, effective_kind: Category["effective_kind"]) =>
	({ name, effective_kind }) as Category;

describe("unsortedCategories", () => {
	it("keeps the ones with no kind of their own or a parent's", () => {
		const c = named;
		expect(
			unsortedCategories([c("A", "need"), c("B", null), c("C", "want"), c("D", undefined)]).map(
				(x) => x.name,
			),
		).toEqual(["B", "D"]);
	});
});
