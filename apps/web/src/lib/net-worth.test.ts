import { describe, expect, it } from "vitest";
import type { NetWorthDrivers } from "#/types/api";
import { changePercent, netWorthSentence, waterfallBars } from "./net-worth";

const make = (
	start: string,
	amounts: Partial<Record<NetWorthDrivers["drivers"][number]["key"], string>>,
): NetWorthDrivers => {
	const keys = ["income", "spending", "adjustments", "transfers", "exchange_rates"] as const;
	const drivers = keys.map((key) => ({ key, amount: amounts[key] ?? "0.0000" }));
	const change = drivers.reduce((s, d) => s + Number(d.amount), 0);
	return {
		currency: "MVR",
		start_date: "2026-10-01",
		end_date: "2026-10-31",
		start,
		end: String(Number(start) + change),
		change: String(change),
		drivers,
		accounts: [],
	};
};
const money = (a: string) => `MVR ${a}`;

describe("waterfallBars", () => {
	it("chains each driver from where the last one ended, then the total", () => {
		const d = make("1000", { income: "500", spending: "-200", exchange_rates: "50" });
		const bars = waterfallBars(d.drivers, d.change);
		expect(bars.map((b) => [b.key, b.low, b.high])).toEqual([
			["income", 0, 500],
			["spending", 300, 500],
			["exchange_rates", 300, 350],
			["change", 0, 350],
		]);
		expect(bars.at(-1)?.kind).toBe("total");
	});

	it("floats below zero when the running change goes negative", () => {
		const d = make("1000", { spending: "-300", income: "100" });
		const bars = waterfallBars(d.drivers, d.change);
		expect(bars.map((b) => [b.key, b.low, b.high])).toEqual([
			["income", 0, 100],
			["spending", -200, 100],
			["change", -200, 0],
		]);
	});

	it("leaves out drivers that came to nothing", () => {
		const d = make("0", { income: "10" });
		expect(waterfallBars(d.drivers, d.change).map((b) => b.key)).toEqual(["income", "change"]);
	});
});

describe("changePercent", () => {
	it("is the change over the start, or null from nothing", () => {
		expect(changePercent({ start: "200", change: "50" })).toBe(25);
		expect(changePercent({ start: "200", change: "-50" })).toBe(-25);
		expect(changePercent({ start: "0", change: "50" })).toBeNull();
		expect(changePercent({ start: "-100", change: "50" })).toBeNull();
	});
});

describe("netWorthSentence", () => {
	it("says what moved and by how much, biggest others first", () => {
		const d = make("1000", {
			income: "500",
			spending: "-200",
			exchange_rates: "50",
			adjustments: "-10",
		});
		expect(netWorthSentence(d, money)).toBe(
			"Net worth rose MVR 340 (34.0%), from MVR 1000 to MVR 1340. You kept MVR 300 (income less spending). Exchange rates added MVR 50, balance adjustments took MVR 10.",
		);
	});

	it("says when spending beat income and net worth fell", () => {
		const d = make("1000", { income: "100", spending: "-400" });
		expect(netWorthSentence(d, money)).toBe(
			"Net worth fell MVR 300 (30.0%), from MVR 1000 to MVR 700. You spent MVR 300 more than you earned.",
		);
	});

	it("handles a start at nothing and a quiet period", () => {
		expect(netWorthSentence(make("0", { income: "10" }), money)).toBe(
			"Net worth rose MVR 10, from MVR 0 to MVR 10. You kept MVR 10 (income less spending).",
		);
		expect(netWorthSentence(make("500", {}), money)).toBe("Net worth stayed at MVR 500.");
	});

	it("notes when it ended where it began but things moved", () => {
		const d = make("500", { income: "100", exchange_rates: "-100" });
		expect(netWorthSentence(d, money)).toContain("ended where it began");
	});
});
