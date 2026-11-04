import { formatMoney } from "./format";
import { fromScaled, toScaled } from "./decimal";
import type { SalaryRule, SalarySplitItem, SalarySplitPlan } from "#/types/api";

const SCALE = 4;

/** "10% of each salary" or "MVR 1,500.00 each time". */
export function ruleText(rule: Pick<SalaryRule, "mode" | "value">, currency: string): string {
	if (rule.mode === "percent") return `${Number(rule.value)}% of each salary`;
	return `${formatMoney(rule.value, currency)} each time`;
}

/** What a set of rules sends on, as one sentence: "10% + 25% + MVR 500.00". */
export function rulesSummary(rules: SalaryRule[], currency: string): string {
	if (rules.length === 0) return "";
	const percent = rules
		.filter((r) => r.mode === "percent")
		.reduce((sum, r) => sum + Number(r.value), 0);
	const fixed = rules.filter((r) => r.mode === "fixed");
	const parts = [
		...(percent > 0 ? [`${Number(percent.toFixed(4))}% of the salary`] : []),
		...fixed.map((r) => formatMoney(r.value, currency)),
	];
	return parts.join(" + ");
}

/** One line of the split being confirmed: a rule's target with an amount that can be edited. */
export type SplitLine = {
	key: string;
	target_type: SalarySplitItem["target_type"];
	target_id: string;
	name: string;
	rule: string;
	amount: string;
	/** Whether it will be made */
	on: boolean;
	/** Why it can't be made, when it can't */
	reason: string | null;
};

/** The lines to confirm, from a plan: those that can be made start ticked, the rest are shown with
 * their reason and cannot be ticked. */
export function splitLines(plan: SalarySplitPlan): SplitLine[] {
	return plan.items.map((i) => ({
		key: i.rule_id,
		target_type: i.target_type,
		target_id: i.target_id,
		name: i.target_name,
		rule: ruleText(i, plan.currency),
		amount: fromScaled(toScaled(i.amount, SCALE) ?? 0n, SCALE),
		on: i.ok,
		reason: i.ok ? null : (i.reason ?? "Can't be made"),
	}));
}

export type SplitTotals = {
	/** The ticked lines added up, exactly */
	total: string;
	/** What stays in the account */
	left: string;
	/** More than the salary is being sent */
	over: boolean;
	/** A ticked line has an amount that is not a positive number */
	invalid: boolean;
	/** How many lines will be made */
	count: number;
};

/** Adds the ticked lines up against the salary, with exact arithmetic. */
export function splitTotals(lines: SplitLine[], salary: string): SplitTotals {
	const ticked = lines.filter((l) => l.on);
	let total = 0n;
	let invalid = false;
	for (const line of ticked) {
		const scaled = toScaled(line.amount, SCALE);
		if (scaled === null || scaled === 0n) invalid = true;
		else total += scaled;
	}
	const whole = toScaled(salary, SCALE) ?? 0n;
	return {
		total: fromScaled(total, SCALE),
		left: fromScaled(whole - total, SCALE),
		over: total > whole,
		invalid,
		count: ticked.length,
	};
}

/** The request for the ticked lines. */
export function splitRequest(lines: SplitLine[]) {
	return lines
		.filter((l) => l.on)
		.map((l) => ({
			target_type: l.target_type,
			target_id: l.target_id,
			amount: fromScaled(toScaled(l.amount, SCALE) ?? 0n, SCALE, 0),
		}));
}
