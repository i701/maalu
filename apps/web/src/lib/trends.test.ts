import { describe, expect, it } from "vitest";
import type { CategoryMonthRow } from "#/types/api";
import {
	busiestMonth,
	cellText,
	columnTotals,
	distinctAccents,
	heat,
	maxCell,
	monthColumn,
	monthTitle,
	monthlyAverage,
	stackSeries,
	stackTotals,
	trendBounds,
} from "./trends";

const row = (amounts: string[], over: Partial<CategoryMonthRow> = {}): CategoryMonthRow => ({
	type: "expense",
	category_id: "c",
	category: "Food",
	color: "blue",
	parent_id: null,
	parent: null,
	parent_color: null,
	amounts,
	total: amounts.reduce((s, a) => (Number(s) + Number(a)).toFixed(4), "0"),
	...over,
});

describe("trendBounds", () => {
	it("ends with this month and starts that many months back", () => {
		expect(trendBounds(12, "2026-11-03")).toEqual({
			date_from: "2025-12-01",
			date_to: "2026-11-30",
		});
		expect(trendBounds(6, "2026-02-10")).toEqual({
			date_from: "2025-09-01",
			date_to: "2026-02-28",
		});
		expect(trendBounds(1, "2026-11-03")).toEqual({
			date_from: "2026-11-01",
			date_to: "2026-11-30",
		});
	});
});

describe("monthTitle", () => {
	it("is the long month and year", () => {
		expect(monthTitle("2026-03")).toBe("March 2026");
	});
});

describe("monthColumn", () => {
	it("is the short month and year", () => {
		expect(monthColumn("2026-03")).toBe("Mar 26");
		expect(monthColumn("2025-12")).toBe("Dec 25");
	});
});

describe("columnTotals", () => {
	it("adds each month up exactly, refunds included", () => {
		const rows = [row(["10.10", "0.00", "5.00"]), row(["0.20", "-3.00", "1.00"])];
		expect(columnTotals(rows, 3)).toEqual(["10.30", "-3.00", "6.00"]);
	});

	it("is all zero with no rows", () => {
		expect(columnTotals([], 2)).toEqual(["0.00", "0.00"]);
	});
});

describe("heat", () => {
	it("is the share of the biggest cell, and nothing for refunds or empty months", () => {
		expect(heat("50", 100)).toBe(0.5);
		expect(heat("100", 100)).toBe(1);
		expect(heat("0.0000", 100)).toBe(0);
		expect(heat("-5", 100)).toBe(0);
		expect(heat("5", 0)).toBe(0);
	});

	it("never goes past one", () => {
		expect(heat("200", 100)).toBe(1);
	});
});

describe("maxCell, monthlyAverage and busiestMonth", () => {
	const r = row(["10", "40", "0", "40"]);

	it("finds the biggest cell", () => {
		expect(maxCell([r, row(["5", "99"])])).toBe(99);
		expect(maxCell([])).toBe(0);
	});

	it("averages over every month shown, quiet ones included", () => {
		expect(monthlyAverage(r)).toBe("22.50");
	});

	it("names the first of the busiest months, or none", () => {
		expect(busiestMonth(r)).toBe(1);
		expect(busiestMonth(row(["0", "-5"]))).toBeNull();
	});
});

describe("cellText", () => {
	it("is compact", () => {
		expect(cellText("0.0000")).toBe("–");
		expect(cellText("12.5")).toBe("12.50");
		expect(cellText("1234.56")).toBe("1,235");
		expect(cellText("-30")).toBe("-30.00");
	});
});

const named = (name: string, amounts: string[], over: Partial<CategoryMonthRow> = {}) =>
	row(amounts, { category: name, category_id: name, ...over });

describe("stackSeries", () => {
	it("puts the biggest category first and folds the rest into Other", () => {
		const rows = [
			named("Small", ["1", "1"]),
			named("Big", ["50", "60"]),
			named("Mid", ["10", "10"]),
			named("Tiny", ["0.5", "0.5"]),
		];
		const series = stackSeries(rows, 2);
		expect(series.map((s) => s.name)).toEqual(["Big", "Mid", "Other"]);
		expect(series[2].values).toEqual([1.5, 1.5]);
		expect(series[2].color).toBeNull();
	});

	it("does not hide a lone category behind Other", () => {
		const rows = [named("A", ["3"]), named("B", ["2"]), named("C", ["1"])];
		expect(stackSeries(rows, 2).map((s) => s.name)).toEqual(["A", "B", "C"]);
	});

	it("leaves out categories that came to nothing and clamps refunds at zero", () => {
		const rows = [named("Used", ["10", "-4"]), named("Never", ["0", "0"])];
		const series = stackSeries(rows);
		expect(series.map((s) => s.name)).toEqual(["Used"]);
		expect(series[0].values).toEqual([10, 0]);
	});

	it("names a sub-category with its parent", () => {
		expect(stackSeries([named("Dining", ["5"], { parent: "Food" })])[0].name).toBe("Food › Dining");
	});

	it("adds the columns up", () => {
		const series = stackSeries([named("A", ["3", "1"]), named("B", ["2", "0"])]);
		expect(stackTotals(series, 2)).toEqual([5, 1]);
	});
});

const s = (name: string, color: string | null) => ({ name, color, values: [1] });

describe("distinctAccents", () => {
	const palette = ["violet", "orange", "amber", "blue"];

	it("keeps each category's own accent when it is free", () => {
		expect(distinctAccents([s("a", "blue"), s("b", "orange")], palette)).toEqual([
			"blue",
			"orange",
		]);
	});

	it("gives a repeat the first accent no series in the chart has", () => {
		expect(
			distinctAccents([s("a", "orange"), s("b", "orange"), s("c", "violet")], palette),
		).toEqual(["orange", "amber", "violet"]);
	});

	it("leaves Other without an accent and does not count it", () => {
		expect(distinctAccents([s("a", "violet"), s("Other", null)], palette)).toEqual([
			"violet",
			null,
		]);
	});
});
