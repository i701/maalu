import { describe, expect, it } from "vitest";
import type { CategoryTotal } from "#/types/api";
import {
	fillRows,
	monthBounds,
	monthLabel,
	orderSections,
	percentChange,
	shiftMonth,
	spendingRows,
} from "./dashboard";

describe("monthBounds", () => {
	it("gives the first and last day of the month", () => {
		expect(monthBounds("2026-10-17")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
		expect(monthBounds("2026-04-01")).toEqual({ start: "2026-04-01", end: "2026-04-30" });
	});

	it("knows February, including leap years", () => {
		expect(monthBounds("2026-02-10").end).toBe("2026-02-28");
		expect(monthBounds("2028-02-10").end).toBe("2028-02-29");
	});

	it("handles December", () => {
		expect(monthBounds("2026-12-25")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
	});
});

describe("shiftMonth", () => {
	it("moves by whole months and returns the first day", () => {
		expect(shiftMonth("2026-10-17", 1)).toBe("2026-11-01");
		expect(shiftMonth("2026-10-17", -1)).toBe("2026-09-01");
		expect(shiftMonth("2026-10-31", 0)).toBe("2026-10-01");
	});

	it("crosses year boundaries both ways", () => {
		expect(shiftMonth("2026-12-05", 1)).toBe("2027-01-01");
		expect(shiftMonth("2026-01-05", -1)).toBe("2025-12-01");
		expect(shiftMonth("2026-03-05", -15)).toBe("2024-12-01");
	});

	it("is not thrown by a month with fewer days", () => {
		expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-01");
	});
});

describe("monthLabel", () => {
	it("names the month and year, or just the short month", () => {
		expect(monthLabel("2026-10-17")).toBe("October 2026");
		expect(monthLabel("2026-03-01", true)).toBe("Mar");
	});
});

describe("percentChange", () => {
	it("is the change relative to the previous value", () => {
		expect(percentChange("120", "100")).toBeCloseTo(20);
		expect(percentChange("50", "100")).toBeCloseTo(-50);
		expect(percentChange("32655.5600", "26262.1000")).toBeCloseTo(24.34, 1);
	});

	it("is zero when nothing changed", () => {
		expect(percentChange("80", "80")).toBe(0);
	});

	it("is null when there is nothing meaningful to compare with", () => {
		expect(percentChange("10", "0")).toBeNull();
		expect(percentChange("10", "0.0000")).toBeNull();
		expect(percentChange("10", "-5")).toBeNull();
	});
});

const total = (
	category: string,
	value: string,
	type: "income" | "expense" = "expense",
): CategoryTotal => ({
	type,
	category_id: category,
	category,
	color: "blue",
	kind: null,
	parent: null,
	parent_color: null,
	parent_id: null,
	total: value,
	count: 1,
});

describe("spendingRows", () => {
	it("ranks expense categories by amount with their share", () => {
		const rows = spendingRows([total("Fuel", "100"), total("Food", "300"), total("Rent", "600")]);
		expect(rows.map((r) => r.name)).toEqual(["Rent", "Food", "Fuel"]);
		expect(rows.map((r) => Math.round(r.share * 100))).toEqual([60, 30, 10]);
	});

	it("ignores income and empty categories", () => {
		const rows = spendingRows([
			total("Salary", "5000", "income"),
			total("Fuel", "100"),
			total("Gift", "0"),
		]);
		expect(rows.map((r) => r.name)).toEqual(["Fuel"]);
		expect(rows[0].share).toBe(1);
	});

	it("folds the tail into Other", () => {
		const many = Array.from({ length: 9 }, (_, i) => total(`C${i}`, String(100 - i)));
		const rows = spendingRows(many, 6);
		expect(rows).toHaveLength(7);
		expect(rows[6].name).toBe("Other");
		expect(rows[6].total).toBe(94 + 93 + 92); // C6, C7, C8 as 100-6, 100-7, 100-8
		expect(rows.reduce((acc, r) => acc + r.share, 0)).toBeCloseTo(1);
	});

	it("has no Other row when everything fits", () => {
		expect(spendingRows([total("A", "1"), total("B", "2")], 6).map((r) => r.name)).toEqual([
			"B",
			"A",
		]);
	});

	it("is empty when nothing was spent", () => {
		expect(spendingRows([])).toEqual([]);
		expect(spendingRows([total("Salary", "1", "income")])).toEqual([]);
	});
});

describe("orderSections", () => {
	const visible = ["a", "b", "c", "d"];

	it("keeps the default order with nothing saved", () => {
		expect(orderSections(null, visible)).toEqual(visible);
	});

	it("follows the saved order, puts new sections last and skips saved ones not on show", () => {
		expect(orderSections(["c", "gone", "a"], visible)).toEqual(["c", "a", "b", "d"]);
	});
});

const card = (id: string, span: number) => ({ id, span });
const spans = (cards: { id: string; span: number }[]) => [...fillRows(cards).values()];

describe("fillRows", () => {
	it("leaves full rows as they are", () => {
		expect(spans([card("a", 2), card("b", 4), card("c", 6), card("d", 3), card("e", 3)])).toEqual([
			2, 4, 6, 3, 3,
		]);
	});

	it("shares a short row's spare columns between its cards", () => {
		// Spending (2) and Budget (2) with the 4-wide cards turned off
		expect(spans([card("a", 2), card("b", 2)])).toEqual([3, 3]);
	});

	it("gives a lone card the whole row", () => {
		expect(spans([card("a", 4)])).toEqual([6]);
		expect(spans([card("a", 3)])).toEqual([6]);
	});

	it("starts a new row when a card does not fit, and fills each row on its own", () => {
		// 2 | 4 + 4 does not fit, so the 2 is alone and the 4s are alone too
		expect(spans([card("a", 2), card("b", 4), card("c", 4)])).toEqual([2, 4, 6]);
		expect(spans([card("a", 4), card("b", 4)])).toEqual([6, 6]);
	});

	it("hands an odd spare column to the first card of the row", () => {
		// 1 + 2 leaves 3: one each, and the odd one to the first
		expect(spans([card("a", 1), card("b", 2)])).toEqual([3, 3]);
		expect(spans([card("a", 1), card("b", 1), card("c", 2)])).toEqual([2, 2, 2]);
		// 1 + 1 + 3 leaves 1: it goes to the first card
		expect(spans([card("a", 1), card("b", 1), card("c", 3)])).toEqual([2, 1, 3]);
	});
});
