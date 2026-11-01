import { describe, expect, it } from "vitest";
import { lastMonths, netRows } from "./cash-flow";

const month = (m: string, income: string, expense: string) => ({ month: m, income, expense });

describe("netRows", () => {
	it("is income less expenses, exactly", () => {
		const [a, b] = netRows([
			month("2026-09", "1000.10", "400.20"),
			month("2026-10", "100.00", "250.50"),
		]);
		expect(a.netText).toBe("599.90");
		expect(a.net).toBeCloseTo(599.9);
		expect(b.netText).toBe("-150.50");
		expect(b.net).toBeCloseTo(-150.5);
	});

	it("handles a month where refunds took spending below zero", () => {
		const [row] = netRows([month("2026-10", "0.00", "-30.00")]);
		expect(row.net).toBe(30); // more came back than went out
		expect(row.expense).toBe(-30);
	});

	it("keeps the months in the order they came", () => {
		const rows = netRows([month("2026-08", "1", "0"), month("2026-09", "2", "0")]);
		expect(rows.map((r) => r.month)).toEqual(["2026-08", "2026-09"]);
	});
});

describe("the running total", () => {
	it("adds up what was kept from the first month shown", () => {
		const rows = netRows([
			month("2026-08", "500.00", "200.00"), // +300
			month("2026-09", "100.00", "250.50"), // -150.50
			month("2026-10", "400.00", "100.00"), // +300
		]);
		expect(rows.map((r) => r.runningText)).toEqual(["300.00", "149.50", "449.50"]);
		expect(rows[2].running).toBeCloseTo(449.5);
	});

	it("starts over for a different set of months", () => {
		const all = [month("2026-08", "500", "200"), month("2026-09", "100", "50")];
		expect(netRows(lastMonths(all, 1))[0].runningText).toBe("50.00");
	});

	it("can go below zero", () => {
		const rows = netRows([month("2026-09", "100", "400")]);
		expect(rows[0].running).toBe(-300);
	});
});

describe("lastMonths", () => {
	it("keeps the newest, oldest first", () => {
		expect(lastMonths([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
	});
	it("gives them all when there are fewer", () => {
		expect(lastMonths([1, 2], 6)).toEqual([1, 2]);
	});
});
