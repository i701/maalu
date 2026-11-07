import { describe, expect, it } from "vitest";
import type { CategoryTotal } from "#/types/api";
import { formatPercent, incomeRule, targetText } from "./budget-rule";

const cat = (type: "income" | "expense", total: string, kind: "need" | "want" | null = null) =>
	({ type, total, kind }) as CategoryTotal;

describe("incomeRule", () => {
	it("measures needs, wants and what was kept against the income", () => {
		const rule = incomeRule([
			cat("income", "10000"),
			cat("expense", "3000", "need"),
			cat("expense", "1500", "need"),
			cat("expense", "2000", "want"),
		]);
		expect(rule?.income).toBe("10000.00");
		expect(rule?.rows.map((r) => [r.key, r.amount, r.percent, r.status])).toEqual([
			["need", "4500.00", 45, "on"],
			["want", "2000.00", 20, "on"],
			["save", "3500.00", 35, "on"],
		]);
		expect(rule?.unsorted).toBeNull();
	});

	it("says over and below when the targets are missed", () => {
		const rule = incomeRule([
			cat("income", "10000"),
			cat("expense", "6000", "need"),
			cat("expense", "3500", "want"),
		]);
		expect(rule?.rows.map((r) => [r.key, r.percent, r.status])).toEqual([
			["need", 60, "over"],
			["want", 35, "over"],
			["save", 5, "below"],
		]);
	});

	it("takes exactly the target as on target", () => {
		const rule = incomeRule([
			cat("income", "1000"),
			cat("expense", "500", "need"),
			cat("expense", "300", "want"),
		]);
		expect(rule?.rows.map((r) => r.status)).toEqual(["on", "on", "on"]); // 50, 30 and 20 kept
	});

	it("counts spending that is not sorted against what was kept, but does not judge it", () => {
		const rule = incomeRule([
			cat("income", "1000"),
			cat("expense", "200", "need"),
			cat("expense", "300"),
		]);
		expect(rule?.unsorted).toEqual({ amount: "300.00", percent: 30 });
		expect(rule?.rows[2]).toMatchObject({ key: "save", amount: "500.00", percent: 50 });
	});

	it("goes below zero when more was spent than earned", () => {
		const rule = incomeRule([cat("income", "1000"), cat("expense", "1200", "want")]);
		expect(rule?.rows[2]).toMatchObject({ amount: "-200.00", percent: -20, status: "below" });
	});

	it("rounds to a tenth of a percent", () => {
		const rule = incomeRule([cat("income", "3000"), cat("expense", "1000", "need")]);
		expect(rule?.rows[0].percent).toBe(33.3);
	});

	it("is null when there was no income", () => {
		expect(incomeRule([])).toBeNull();
		expect(incomeRule([cat("expense", "100", "need")])).toBeNull();
		expect(incomeRule([cat("income", "0"), cat("expense", "100", "need")])).toBeNull();
	});
});

describe("words", () => {
	it("shows a whole percent without a decimal", () => {
		expect(formatPercent(50)).toBe("50%");
		expect(formatPercent(33.3)).toBe("33.3%");
		expect(formatPercent(-20)).toBe("-20%");
	});

	it("states each target", () => {
		expect(targetText("need")).toBe("Up to 50%");
		expect(targetText("want")).toBe("Up to 30%");
		expect(targetText("save")).toBe("At least 20%");
	});
});
