import { describe, expect, it } from "vitest";
import type { Budget, BudgetFixedLine, BudgetLine, BudgetStatus } from "#/types/api";
import {
	addDays,
	budgetByKind,
	budgetWarning,
	datesOverlap,
	describeLine,
	fixedWindow,
	linesNeedingAttention,
	fixedInPeriod,
	nextStretch,
	unsigned,
} from "./budget";

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
	moved_in: "0.0000",
	moved_out: "0.0000",
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

const fixed = (
	name: string,
	status: BudgetStatus,
	categories: string[],
	over: Partial<BudgetFixedLine> = {},
): BudgetFixedLine => ({
	...line(name, status, status === "over" ? 120 : 85, categories),
	start_date: "2026-10-10",
	end_date: "2026-10-20",
	state: "active",
	days_left: 6,
	...over,
});

const withFixed = (lines: BudgetFixedLine[], isCurrent = true): Budget => ({
	...budget([], isCurrent),
	fixed_lines: lines,
});

describe("limits for set dates", () => {
	it("are listed only for the period whose dates they touch", () => {
		const b = withFixed([
			fixed("Inside", "ok", ["Trip"]),
			fixed("Straddles", "ok", ["Trip"], { start_date: "2026-09-20", end_date: "2026-10-02" }),
			fixed("November", "ok", ["Trip"], { start_date: "2026-11-01", end_date: "2026-11-30" }),
			fixed("September", "ok", ["Trip"], { start_date: "2026-09-01", end_date: "2026-09-30" }),
		]);
		expect(fixedInPeriod(b).map((l) => l.name)).toEqual(["Inside", "Straddles"]);
	});

	it("count as needing attention only while they run", () => {
		const b = withFixed([
			fixed("Running", "warning", ["Trip"]),
			fixed("Finished", "over", ["Trip"], { state: "ended", days_left: null }),
			fixed("Soon", "over", ["Trip"], { state: "upcoming" }),
		]);
		expect(linesNeedingAttention(b).map((l) => l.name)).toEqual(["Running"]);
	});

	it("rank with the per-period lines, the worst first", () => {
		const b: Budget = {
			...withFixed([fixed("Trip", "over", ["Trip"])]),
			lines: [line("Food", "warning", 90, ["Food"])],
		};
		expect(linesNeedingAttention(b).map((l) => l.name)).toEqual(["Trip", "Food"]);
	});

	it("warn after an expense inside their dates, even when another period is shown", () => {
		const b = withFixed([fixed("Trip", "warning", ["Trip"])], false);
		expect(budgetWarning(b, ["trip"], "2026-10-15")).toBe("Trip is at 85% of its limit");
	});

	it("do not warn for a day outside their dates", () => {
		const b = withFixed([fixed("Trip", "warning", ["Trip"])]);
		expect(budgetWarning(b, ["Trip"], "2026-10-25")).toBeNull();
		expect(budgetWarning(b, ["Trip"], "2026-10-09")).toBeNull();
		expect(budgetWarning(b, ["Other"], "2026-10-15")).toBeNull();
	});
});

describe("fixedWindow", () => {
	it("says how long is left, or that it has not started or has ended", () => {
		expect(fixedWindow(fixed("A", "ok", []))).toMatch(/10 Oct 2026 – 20 Oct 2026 · 6 days left$/);
		expect(fixedWindow(fixed("A", "ok", [], { days_left: 1 }))).toMatch(/1 day left$/);
		expect(fixedWindow(fixed("A", "ok", [], { state: "upcoming", days_left: 12 }))).toMatch(
			/12 days to its end$/,
		);
		expect(fixedWindow(fixed("A", "ok", [], { state: "ended", days_left: null }))).toMatch(
			/ended$/,
		);
	});
});

describe("datesOverlap", () => {
	it("is true when two stretches share a day, ends included", () => {
		expect(datesOverlap(["2026-10-01", "2026-10-10"], ["2026-10-10", "2026-10-20"])).toBe(true);
		expect(datesOverlap(["2026-10-01", "2026-10-10"], ["2026-10-11", "2026-10-20"])).toBe(false);
		expect(datesOverlap(["2026-10-05", "2026-10-06"], ["2026-10-01", "2026-10-31"])).toBe(true);
	});
});

describe("nextStretch", () => {
	it("starts the day after and lasts as long", () => {
		expect(nextStretch({ start_date: "2026-11-01", end_date: "2026-11-30" })).toEqual({
			start: "2026-12-01",
			end: "2026-12-30",
		});
		expect(nextStretch({ start_date: "2026-12-28", end_date: "2027-01-03" })).toEqual({
			start: "2027-01-04",
			end: "2027-01-10",
		});
	});
});

describe("budgetByKind", () => {
	const of = (name: string, kind: BudgetLine["kind"], activity: string, over = {}) =>
		({ ...line(name, "ok", 10, [name]), kind, activity, ...over }) as BudgetLine;

	it("adds each kind's limits up, with what was carried and moved", () => {
		const out = budgetByKind(
			budget([
				of("Rent", "need", "400.0000"),
				of("Food", "need", "150.5000", { carried: "50.0000", moved_out: "20.0000" }),
				of("Fun", "want", "80.0000"),
				of("Misc", null, "10.0000"),
			]),
		);
		expect(out.map((k) => [k.kind, k.lines, k.spent, k.limit])).toEqual([
			["need", 2, "550.50", "2030.00"],
			["want", 1, "80.00", "1000.00"],
			["unsorted", 1, "10.00", "1000.00"],
		]);
	});

	it("is empty while no limit is a need or a want", () => {
		expect(budgetByKind(budget([of("Misc", null, "10.0000")]))).toEqual([]);
		expect(budgetByKind(budget([]))).toEqual([]);
	});
});
