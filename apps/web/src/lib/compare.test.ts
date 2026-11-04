import { describe, expect, it } from "vitest";
import type { CategoryTotal } from "#/types/api";
import {
	addDays,
	biggestMoves,
	compareRows,
	compareTotals,
	periodsFor,
	sameDayYearsAgo,
	spendingSentence,
} from "./compare";

const cat = (
	id: string,
	type: "income" | "expense",
	total: string,
	over: Partial<CategoryTotal> = {},
): CategoryTotal => ({
	type,
	category_id: id,
	category: id.toUpperCase(),
	color: "blue",
	kind: null,
	parent_id: null,
	parent: null,
	parent_color: null,
	total,
	count: 1,
	...over,
});

describe("dates", () => {
	it("adds days across month and year ends", () => {
		expect(addDays("2026-11-03", -29)).toBe("2026-10-05");
		expect(addDays("2026-01-02", -5)).toBe("2025-12-28");
		expect(addDays("2026-02-27", 3)).toBe("2026-03-02");
	});

	it("goes back a year, clamping 29 February", () => {
		expect(sameDayYearsAgo("2026-11-03", 1)).toBe("2025-11-03");
		expect(sameDayYearsAgo("2028-02-29", 1)).toBe("2027-02-28");
	});
});

describe("periodsFor", () => {
	it("this month is held against the whole of last month", () => {
		const p = periodsFor("this_month", "2026-11-03");
		expect(p.now).toMatchObject({ from: "2026-11-01", to: "2026-11-30", label: "November 2026" });
		expect(p.before).toMatchObject({ from: "2026-10-01", to: "2026-10-31", label: "October 2026" });
	});

	it("last month is held against the month before, across a year end", () => {
		const p = periodsFor("last_month", "2026-01-15");
		expect(p.now).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
		expect(p.before).toMatchObject({ from: "2025-11-01", to: "2025-11-30" });
	});

	it("the last 30 days sit right after the 30 before", () => {
		const p = periodsFor("last_30", "2026-11-03");
		expect(p.now).toMatchObject({ from: "2026-10-05", to: "2026-11-03" });
		expect(p.before).toMatchObject({ from: "2026-09-05", to: "2026-10-04" });
	});

	it("this year is the year so far against the same days a year ago", () => {
		const p = periodsFor("this_year", "2026-11-03");
		expect(p.now).toMatchObject({ from: "2026-01-01", to: "2026-11-03" });
		expect(p.before).toMatchObject({ from: "2025-01-01", to: "2025-11-03" });
	});

	it("custom needs both ranges, each in order", () => {
		const ok = {
			nowFrom: "2026-11-01",
			nowTo: "2026-11-10",
			beforeFrom: "2026-10-01",
			beforeTo: "2026-10-10",
		};
		expect(periodsFor("custom", "2026-11-03", ok)?.now.from).toBe("2026-11-01");
		expect(periodsFor("custom", "2026-11-03", { ...ok, beforeTo: undefined })).toBeNull();
		expect(periodsFor("custom", "2026-11-03", { ...ok, nowTo: "2026-10-01" })).toBeNull();
	});
});

describe("compareRows", () => {
	const before = [
		cat("food", "expense", "100.50"),
		cat("rent", "expense", "500"),
		cat("tv", "expense", "20"),
	];
	const now = [
		cat("food", "expense", "160.25"),
		cat("rent", "expense", "500"),
		cat("gym", "expense", "40"),
	];

	it("lines categories up, exactly, with what is new and what is gone", () => {
		const rows = compareRows(before, now, "expense");
		const by = Object.fromEntries(rows.map((r) => [r.categoryId, r]));
		expect(by.food).toMatchObject({
			before: "100.50",
			now: "160.25",
			change: "59.75",
			state: "both",
		});
		expect(by.rent).toMatchObject({ change: "0.00", percent: 0 });
		expect(by.gym).toMatchObject({
			before: "0",
			now: "40",
			change: "40.00",
			state: "new",
			percent: null,
		});
		expect(by.tv).toMatchObject({ now: "0", change: "-20.00", state: "gone" });
	});

	it("puts the biggest move first, whichever way it went", () => {
		expect(compareRows(before, now, "expense").map((r) => r.categoryId)).toEqual([
			"food",
			"gym",
			"tv",
			"rent",
		]);
	});

	it("keeps income and spending apart", () => {
		const mixed = [cat("pay", "income", "900"), cat("food", "expense", "10")];
		expect(compareRows([], mixed, "income").map((r) => r.categoryId)).toEqual(["pay"]);
		expect(compareRows([], mixed, "expense").map((r) => r.categoryId)).toEqual(["food"]);
	});

	it("a refund-heavy category can come out below zero", () => {
		const rows = compareRows(
			[cat("tv", "expense", "50")],
			[cat("tv", "expense", "-30")],
			"expense",
		);
		expect(rows[0]).toMatchObject({ change: "-80.00" });
	});
});

describe("compareTotals", () => {
	it("sums each period and works out what was kept", () => {
		const t = compareTotals(
			[cat("pay", "income", "1000"), cat("food", "expense", "300"), cat("rent", "expense", "400")],
			[cat("pay", "income", "1200"), cat("food", "expense", "500")],
		);
		expect(t.income).toMatchObject({ before: "1000.00", now: "1200.00", change: "200.00" });
		expect(t.expense).toMatchObject({ before: "700.00", now: "500.00", change: "-200.00" });
		expect(t.kept).toMatchObject({ before: "300.00", now: "700.00", change: "400.00" });
	});

	it("has nothing to compare against when the earlier period is empty", () => {
		const t = compareTotals([], [cat("pay", "income", "10")]);
		expect(t.income.percent).toBeNull();
	});
});

describe("biggestMoves", () => {
	it("splits what went up from what came down, limited to the top few", () => {
		const rows = compareRows(
			[cat("a", "expense", "10"), cat("b", "expense", "50"), cat("c", "expense", "5")],
			[
				cat("a", "expense", "90"),
				cat("b", "expense", "20"),
				cat("c", "expense", "5"),
				cat("d", "expense", "1"),
			],
			"expense",
		);
		const { up, down } = biggestMoves(rows, 1);
		expect(up.map((r) => r.categoryId)).toEqual(["a"]);
		expect(down.map((r) => r.categoryId)).toEqual(["b"]);
	});
});

const money = (a: string) => `MVR ${a}`;
const run = (b: CategoryTotal[], n: CategoryTotal[]) => {
	const t = compareTotals(b, n);
	return spendingSentence(t.expense, compareRows(b, n, "expense"), "October", money);
};

describe("spendingSentence", () => {
	it("says it went up and names what drove it", () => {
		expect(
			run(
				[cat("food", "expense", "100"), cat("rent", "expense", "500")],
				[cat("food", "expense", "300"), cat("rent", "expense", "500"), cat("gym", "expense", "50")],
			),
		).toBe(
			"Spending is up MVR 250.00 (42%) on October. Most of it: FOOD +MVR 200.00, GYM +MVR 50.00.",
		);
	});

	it("says it went down and names what drove that", () => {
		expect(run([cat("food", "expense", "300")], [cat("food", "expense", "100")])).toBe(
			"Spending is down MVR 200.00 (67%) on October. Most of it: FOOD -MVR 200.00.",
		);
	});

	it("leaves out percent when there was nothing before, and handles empty and equal periods", () => {
		expect(run([], [cat("food", "expense", "40")])).toBe(
			"Spending is up MVR 40.00 on October. Most of it: FOOD +MVR 40.00.",
		);
		expect(run([], [])).toBe("There is no spending in either period.");
		expect(run([cat("a", "expense", "5")], [cat("a", "expense", "5")])).toBe(
			"Spending is the same as in October.",
		);
	});
});
