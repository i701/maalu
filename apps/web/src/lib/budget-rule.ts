import type { CategoryTotal } from "#/types/api";
import { sumDecimals } from "./format";

/** The 50/30/20 rule: at most half of income on needs, at most 30% on wants, at least 20% kept. */
export const RULE_TARGETS = { need: 50, want: 30, save: 20 } as const;

export type RuleKey = keyof typeof RULE_TARGETS;
/** `on`: within the target. `over`: spent more than the limit. `below`: kept less than the goal. */
export type RuleStatus = "on" | "over" | "below";

export type RuleRow = {
	key: RuleKey;
	label: string;
	/** In the base currency, exact. Savings is income less all spending, so it can be negative. */
	amount: string;
	/** Of the period's income, to one decimal (can be negative for savings, or above 100) */
	percent: number;
	target: number;
	status: RuleStatus;
};

export type IncomeRule = {
	income: string;
	rows: RuleRow[];
	/** Spending whose categories are not sorted into need or want: it counts as spending (so it
	 * lowers what was kept) but cannot be judged against a target */
	unsorted: { amount: string; percent: number } | null;
};

const LABELS: Record<RuleKey, string> = { need: "Needs", want: "Wants", save: "Kept" };

const ofIncome = (amount: string, income: string): number =>
	Math.round((Number(amount) / Number(income)) * 1000) / 10;

/** "50%", "12.5%": a whole percent without a decimal. */
export const formatPercent = (p: number): string => `${Number.isInteger(p) ? p : p.toFixed(1)}%`;

/**
 * How the period divides against the 50/30/20 rule, from the category totals the dashboard already
 * has (so it follows `reported()`: no transfers or adjustments, refunds taken off spending). Needs
 * and wants are the spending in those kinds; **kept is income less all spending**, which is money
 * left over, not a transfer to a savings account. Null when there was no income to compare with.
 */
export function incomeRule(categories: CategoryTotal[]): IncomeRule | null {
	const income = sumDecimals(categories.filter((c) => c.type === "income").map((c) => c.total));
	if (!(Number(income) > 0)) return null;
	const spending = categories.filter((c) => c.type === "expense");
	const kindTotal = (kind: string | null) =>
		sumDecimals(spending.filter((c) => (c.kind ?? null) === kind).map((c) => c.total));
	const need = kindTotal("need");
	const want = kindTotal("want");
	const unsorted = kindTotal(null);
	const kept = sumDecimals([income, `-${sumDecimals(spending.map((c) => c.total))}`]);

	const row = (key: RuleKey, amount: string): RuleRow => {
		const percent = ofIncome(amount, income);
		const target = RULE_TARGETS[key];
		const status: RuleStatus =
			key === "save" ? (percent >= target ? "on" : "below") : percent <= target ? "on" : "over";
		return { key, label: LABELS[key], amount, percent, target, status };
	};
	return {
		income,
		rows: [row("need", need), row("want", want), row("save", kept)],
		unsorted:
			Number(unsorted) > 0 ? { amount: unsorted, percent: ofIncome(unsorted, income) } : null,
	};
}

/** The words for a row's status. */
export const STATUS_TEXT: Record<RuleStatus, string> = {
	on: "On target",
	over: "Over target",
	below: "Below target",
};

/** "Up to 50%" for needs and wants, "At least 20%" for what is kept. */
export const targetText = (key: RuleKey): string =>
	key === "save" ? `At least ${RULE_TARGETS.save}%` : `Up to ${RULE_TARGETS[key]}%`;
