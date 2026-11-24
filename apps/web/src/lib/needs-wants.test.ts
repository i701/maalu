import { describe, expect, it } from "vitest";
import type { Category, CategoryMonthRow, CategoryTotal } from "#/types/api";
import { compareKinds, kindMonths, kindShares, unsortedCategories } from "./needs-wants";
import { categoryTotal, makeCategory } from "#/test/fixtures";

const cat = (
	category: string,
	total: string,
	kind: CategoryTotal["kind"] = null,
	type: CategoryTotal["type"] = "expense",
): CategoryTotal => categoryTotal({ type, category, total, kind });

describe("kindShares", () => {
	it("splits spending into needs, wants and not sorted", () => {
		const rows = kindShares([
			cat("Food", "300.10", "need"),
			cat("Rent", "100", "need"),
			cat("Games", "100", "want"),
			cat("Misc", "100", null),
		]);
		expect(rows?.map((r) => r.kind)).toEqual(["need", "want", "unsorted"]);
		expect(rows?.map((r) => r.total)).toEqual(["400.10", "100.00", "100.00"]);
		expect(rows?.map((r) => r.categories)).toEqual([2, 1, 1]);
		expect(rows?.[0]?.share).toBeCloseTo(400.1 / 600.1);
		expect(rows?.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1);
	});

	it("leaves income out", () => {
		const rows = kindShares([cat("Salary", "5000", "need", "income"), cat("Food", "50", "need")]);
		expect(rows?.[0]?.total).toBe("50.00");
	});

	it("gives a kind that came to nothing or less no share", () => {
		const rows = kindShares([cat("Food", "100", "need"), cat("Refunded", "-20", "want")]);
		expect(rows?.[1]?.total).toBe("-20.00");
		expect(rows?.[1]?.share).toBe(0);
		expect(rows?.[0]?.share).toBe(1);
	});

	it("is null when nothing was spent", () => {
		expect(kindShares([])).toBeNull();
		expect(kindShares([cat("Food", "0", "need")])).toBeNull();
		expect(kindShares([cat("Salary", "10", null, "income")])).toBeNull();
	});
});

const named = (
	name: string,
	effective_kind: Category["effective_kind"],
	is_salary = false,
	transaction_count = 1,
): Category => ({ ...makeCategory({ name, is_salary, transaction_count }), effective_kind });

describe("unsortedCategories", () => {
	it("keeps the ones with no kind of their own or a parent's", () => {
		const c = named;
		expect(unsortedCategories([c("Salary", null, true), c("B", null)]).map((x) => x.name)).toEqual([
			"B",
		]);
		expect(
			unsortedCategories([c("A", "need"), c("B", null), c("C", "want"), c("D", undefined)]).map(
				(x) => x.name,
			),
		).toEqual(["B", "D"]);
	});

	it("leaves out a category that has never been used, because it cannot move a figure", () => {
		const c = named;
		expect(
			unsortedCategories([c("Used", null), c("Never used", null, false, 0)]).map((x) => x.name),
		).toEqual(["Used"]);
	});
});

describe("compareKinds", () => {
	it("puts each kind's spending in the two periods side by side", () => {
		const rows = compareKinds(
			[cat("Food", "200", "need"), cat("Games", "50", "want")],
			[cat("Food", "300.50", "need"), cat("Misc", "40", null), cat("Pay", "999", "need", "income")],
		);
		expect(rows.map((r) => [r.category, r.before, r.now, r.change, r.state])).toEqual([
			["Needs", "200.00", "300.50", "100.50", "both"],
			["Wants", "50.00", "0.00", "-50.00", "gone"],
			["Not sorted", "0.00", "40.00", "40.00", "new"],
		]);
	});

	it("leaves out a kind with nothing in either period", () => {
		expect(compareKinds([cat("Food", "10", "need")], [cat("Food", "20", "need")])).toHaveLength(1);
	});
});

const row = (
	kind: CategoryMonthRow["kind"],
	amounts: string[],
	type: CategoryMonthRow["type"] = "expense",
): CategoryMonthRow => ({
	type,
	kind,
	amounts,
	category: "Test",
	category_id: "test-id",
	color: "#000000",
	parent: null,
	parent_color: null,
	parent_id: null,
	total: amounts.reduce((sum, val) => sum + parseFloat(val || "0"), 0).toFixed(2),
});

describe("kindMonths", () => {
	it("adds each kind's categories up month by month", () => {
		const out = kindMonths(
			[row("need", ["10.00", "20.00"]), row("need", ["5.00", "0.00"]), row(null, ["1.00", "2.00"])],
			2,
		);
		expect(out.map((k) => [k.kind, k.amounts, k.total])).toEqual([
			["need", ["15.00", "20.00"], "35.00"],
			["unsorted", ["1.00", "2.00"], "3.00"],
		]);
	});
});
