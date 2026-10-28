import { describe, expect, it } from "vitest";
import type { Budget, BudgetLine, BudgetStatus } from "#/types/api";
import { addDays, budgetWarning, describeLine, linesNeedingAttention, unsigned } from "./budget";

describe("addDays", () => {
	it("moves by days without time-zone drift", () => {
		expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
		expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDays("2026-10-15", 0)).toBe("2026-10-15");
	});

	it("handles longer jumps", () => {
		expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
		expect(addDays("2026-01-01", -31)).toBe("2025-12-01");
	});
});

describe("unsigned", () => {
	it("drops a minus sign only", () => {
		expect(unsigned("-140.19")).toBe("140.19");
		expect(unsigned("140.19")).toBe("140.19");
	});
});

const line = (
	name: string,
	status: BudgetStatus,
	percent: number,
	categories: string[],
	available = "100.0000",
): BudgetLine => ({
	id: name,
	name,
	categories: categories.map((c) => ({ id: c, name: c })),
	amount: "1000.0000",
	rollover: false,
	warn_percent: null,
	carried: "0.0000",
	activity: "0.0000",
	available,
	percent,
	status,
});

const budget = (lines: BudgetLine[], isCurrent = true): Budget => ({
	currency: "MVR",
	period_start_day: 1,
	warn_percent: 80,
	period: { start: "2026-10-01", end: "2026-10-31", is_current: isCurrent },
	lines,
	totals: { amount: "0", activity: "0", available: "0", percent: 0, status: "ok" },
	attention: 0,
});

describe("linesNeedingAttention", () => {
	it("keeps only lines that are close or over, the worst first", () => {
		const lines = [
			line("Fine", "ok", 10, ["a"]),
			line("Close", "warning", 85, ["b"]),
			line("Way over", "over", 140, ["c"]),
			line("Just over", "over", 101, ["d"]),
			line("Closer", "warning", 95, ["e"]),
		];
		expect(linesNeedingAttention(budget(lines)).map((l) => l.name)).toEqual([
			"Way over",
			"Just over",
			"Closer",
			"Close",
		]);
	});

	it("does not reorder the budget's own lines", () => {
		const lines = [line("A", "warning", 80, ["a"]), line("B", "over", 120, ["b"])];
		linesNeedingAttention(budget(lines));
		expect(lines.map((l) => l.name)).toEqual(["A", "B"]);
	});

	it("is empty when everything is on track", () => {
		expect(linesNeedingAttention(budget([line("Fine", "ok", 10, ["a"])]))).toEqual([]);
	});
});

describe("describeLine", () => {
	it("says how close a line is", () => {
		expect(describeLine(line("Groceries", "warning", 85, ["g"]), "MVR")).toBe(
			"Groceries is at 85% of its limit",
		);
	});

	it("says how far over a line is, without a minus sign", () => {
		const text = describeLine(line("Dining", "over", 107, ["d"], "-140.1900"), "MVR");
		expect(text).toContain("Dining is over its limit by");
		expect(text).toContain("140.19");
		expect(text).not.toContain("-");
	});
});

describe("budgetWarning", () => {
	const lines = [
		line("Food", "warning", 85, ["Groceries", "Snacks"]),
		line("Car", "ok", 5, ["Fuel"]),
	];

	it("warns about the line that covers a saved category", () => {
		expect(budgetWarning(budget(lines), ["Groceries"])).toBe("Food is at 85% of its limit");
	});

	it("ignores case and extra spaces, like the API's category names", () => {
		expect(budgetWarning(budget(lines), ["  grOceRies "])).toBe("Food is at 85% of its limit");
		expect(budgetWarning(budget(lines), ["snacks"])).not.toBeNull();
	});

	it("says nothing for a line that is fine or a category no line covers", () => {
		expect(budgetWarning(budget(lines), ["Fuel"])).toBeNull();
		expect(budgetWarning(budget(lines), ["Travel"])).toBeNull();
		expect(budgetWarning(budget(lines), [])).toBeNull();
	});

	it("picks the worst of several matching lines", () => {
		const two = [
			line("Food", "warning", 85, ["Groceries"]),
			line("Fun", "over", 120, ["Dining"], "-5.0000"),
		];
		expect(budgetWarning(budget(two), ["Groceries", "Dining"])).toContain("Fun is over");
	});

	it("says nothing about a past period", () => {
		expect(budgetWarning(budget(lines, false), ["Groceries"])).toBeNull();
	});
});
