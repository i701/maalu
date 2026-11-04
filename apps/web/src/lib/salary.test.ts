import { describe, expect, it } from "vitest";
import type { SalaryRule, SalarySplitPlan } from "#/types/api";
import { ruleText, rulesSummary, splitLines, splitRequest, splitTotals } from "./salary";

const rule = (mode: "percent" | "fixed", value: string) => ({ mode, value }) as SalaryRule;

describe("ruleText", () => {
	it("says a share or an amount", () => {
		expect(ruleText(rule("percent", "10.0000"), "MVR")).toBe("10% of each salary");
		expect(ruleText(rule("percent", "12.5"), "MVR")).toBe("12.5% of each salary");
		expect(ruleText(rule("fixed", "1500"), "MVR")).toMatch(/1,500\.00 each time/);
	});
});

describe("rulesSummary", () => {
	it("adds the shares up and lists the fixed amounts", () => {
		expect(rulesSummary([], "MVR")).toBe("");
		expect(rulesSummary([rule("percent", "10"), rule("percent", "5.5")], "MVR")).toBe(
			"15.5% of the salary",
		);
		expect(rulesSummary([rule("percent", "20"), rule("fixed", "500")], "MVR")).toMatch(
			/^20% of the salary \+ .*500\.00$/,
		);
	});
});

const plan = (items: Partial<SalarySplitPlan["items"][number]>[]): SalarySplitPlan =>
	({
		amount: "10000.0000",
		currency: "MVR",
		items: items.map((i, n) => ({
			rule_id: `r${n}`,
			target_type: "account",
			target_id: `t${n}`,
			target_name: `T${n}`,
			amount: "1000.0000",
			mode: "fixed",
			value: "1000",
			ok: true,
			reason: null,
			...i,
		})),
	}) as SalarySplitPlan;

describe("splitLines", () => {
	it("ticks what can be made and leaves the rest off with their reason", () => {
		const lines = splitLines(plan([{}, { ok: false, reason: "That is the account it came in" }]));
		expect(lines.map((l) => l.on)).toEqual([true, false]);
		expect(lines[0].amount).toBe("1000.00");
		expect(lines[1].reason).toBe("That is the account it came in");
	});
});

describe("splitTotals", () => {
	const lines = splitLines(plan([{ amount: "1050.5000" }, { amount: "1500.0000" }]));

	it("adds the ticked lines up exactly and says what stays", () => {
		const t = splitTotals(lines, "10000.0000");
		expect(t).toMatchObject({ total: "2550.50", left: "7449.50", over: false, count: 2 });
	});

	it("ignores unticked lines", () => {
		const off = lines.map((l, i) => ({ ...l, on: i === 0 }));
		expect(splitTotals(off, "10000.0000").total).toBe("1050.50");
	});

	it("is over when more than the salary is sent, and not at exactly the salary", () => {
		expect(splitTotals(lines, "2550.4999").over).toBe(true);
		expect(splitTotals(lines, "2550.5000").over).toBe(false);
	});

	it("is invalid when a ticked amount is not a positive number", () => {
		for (const bad of ["", "abc", "0", "-5", "1.23456"]) {
			const edited = lines.map((l, i) => (i === 0 ? { ...l, amount: bad } : l));
			expect(splitTotals(edited, "10000").invalid).toBe(true);
		}
	});
});

describe("splitRequest", () => {
	it("sends the ticked lines with their edited amounts", () => {
		const lines = splitLines(plan([{}, {}])).map((l, i) =>
			i === 0 ? { ...l, amount: "1234.5" } : { ...l, on: false },
		);
		expect(splitRequest(lines)).toEqual([
			{ target_type: "account", target_id: "t0", amount: "1234.5" },
		]);
	});
});
