import { describe, expect, it } from "vitest";
import type { Budget, BudgetLine, BudgetMove, BudgetMoveLogEntry } from "#/types/api";
import { historyByPeriod, moveProblem, moveSources, movesFor, periodLimit } from "./budget-moves";

const line = (id: string, name: string, extra: Partial<BudgetLine> = {}): BudgetLine => ({
	id,
	name,
	categories: [],
	amount: "4000.0000",
	rollover: false,
	warn_percent: null,
	carried: "0.0000",
	moved_in: "0.0000",
	moved_out: "0.0000",
	activity: "0.0000",
	available: "4000.0000",
	percent: 0,
	status: "ok",
	...extra,
});

const move = (id: string, to: string, from: string | null, amount: string): BudgetMove => ({
	id,
	to_line: { id: to, name: to },
	from_line: from ? { id: from, name: from } : null,
	amount,
	note: null,
	created_at: "2026-11-06T10:00:00Z",
});

describe("periodLimit", () => {
	it("adds what was carried and moved in and takes off what was moved out", () => {
		expect(
			periodLimit(
				line("g", "Groceries", { carried: "150.0000", moved_in: "600.0000", moved_out: "50.0000" }),
			),
		).toBe("4700.00");
	});
});

describe("movesFor", () => {
	const moves = [move("1", "Groceries", "Dining", "600.0000"), move("2", "Groceries", null, "300")];

	// Intl puts a no-break space after the currency code
	const texts = (lineId: string) =>
		movesFor(moves, lineId, "MVR").map((m) => m.text.replaceAll(" ", " "));

	it("says each move from the limit's own side", () => {
		expect(texts("Groceries")).toEqual(["+MVR 600.00 from Dining", "+MVR 300.00 added"]);
		expect(texts("Dining")).toEqual(["−MVR 600.00 to Groceries"]);
		expect(movesFor(moves, "Rent", "MVR")).toEqual([]);
	});
});

describe("moveSources", () => {
	it("lists the other limits, most left first, marking empty ones", () => {
		const budget = {
			lines: [
				line("g", "Groceries"),
				line("d", "Dining", { available: "1800.0000" }),
				line("t", "Taxi", { available: "-20.0000" }),
				line("f", "Fun", { available: "2500.0000" }),
			],
		} as Budget;
		expect(moveSources(budget, "g").map((s) => [s.line.name, s.usable])).toEqual([
			["Fun", true],
			["Dining", true],
			["Taxi", false],
		]);
	});
});

describe("moveProblem", () => {
	it("needs a positive amount no bigger than what is left", () => {
		expect(moveProblem("", "100")).toBe("Enter an amount greater than 0");
		expect(moveProblem("0", "100")).toBe("Enter an amount greater than 0");
		expect(moveProblem("1.23456", "100")).toBe("Enter an amount greater than 0");
		expect(moveProblem("100", "100.0000")).toBeNull();
		expect(moveProblem("100.01", "100.0000")).toBe("That is more than it has left");
	});

	it("puts no cap on a top-up", () => {
		expect(moveProblem("999999", null)).toBeNull();
	});
});

const entry = (id: string, start: string, end: string): BudgetMoveLogEntry => ({
	...move(id, "Groceries", "Dining", "10"),
	period_start: start,
	period_end: end,
	undone_at: null,
});

describe("historyByPeriod", () => {
	it("groups moves by their period, newest period first, keeping their order", () => {
		const groups = historyByPeriod([
			entry("c", "2026-11-01", "2026-11-30"),
			entry("b", "2026-10-01", "2026-10-31"),
			entry("a", "2026-11-01", "2026-11-30"),
		]);
		expect(groups.map((g) => [g.start, g.end, g.entries.map((e) => e.id)])).toEqual([
			["2026-11-01", "2026-11-30", ["c", "a"]],
			["2026-10-01", "2026-10-31", ["b"]],
		]);
	});
});
