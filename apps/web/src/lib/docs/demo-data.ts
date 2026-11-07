import type { AvailableToSpend, Budget, BudgetLine, CardStatement, SalaryRule } from "#/types/api";

/** A credit card with a statement still to pay, for the guide's live example. Made up, with fixed
 * dates so it reads the same whenever it is opened. */
export const statementDemo: CardStatement = {
	account_id: "00000000-0000-4000-8000-000000000001",
	account_name: "BML Visa",
	currency: "MVR",
	statement_day: 2,
	due_day: 11,
	closed_on: "2026-11-02",
	due_on: "2026-11-11",
	next_closes_on: "2026-12-02",
	statement_balance: "7190.5000",
	paid_since: "0.0000",
	remaining: "7190.5000",
	remaining_base: "7190.5000",
	spent_since: "420.0000",
	owed_now: "7610.5000",
	credit_limit: "15000.0000",
	state: "due",
	days_until_due: 4,
};

// ── Month plan ──────────────────────────────────────────────────────────────────────────────────

/** A month plan that runs short at one bill: a few bills, a credit card statement, a planned
 * transfer into savings and a salary that is expected but not counted. Today is 5 Nov 2026. */
export const planDemo: AvailableToSpend = {
	currency: "MVR",
	today: "2026-11-05",
	period_start: "2026-11-01",
	period_end: "2026-11-30",
	accounts: [
		{ id: "a1", name: "BML Current", group: "accounts", balance: "5200.0000" },
		{ id: "a2", name: "Cash", group: "cash", balance: "1800.0000" },
	],
	balance: "7000.0000",
	bills: [
		{
			id: "b1",
			title: "Home broadband",
			date: "2026-11-06",
			amount: "399.0000",
			overdue: false,
			subscription: "Home broadband",
			account: "BML Current",
			estimate: false,
			transfer: false,
		},
		{
			id: "b2",
			title: "Mobile plan",
			date: "2026-11-10",
			amount: "250.0000",
			overdue: false,
			subscription: "Mobile plan",
			account: "BML Current",
			estimate: false,
			transfer: false,
		},
		{
			id: "b3",
			title: "Electricity",
			date: "2026-11-12",
			amount: "463.8000",
			overdue: false,
			subscription: "Electricity",
			account: "BML Current",
			estimate: true,
			transfer: false,
		},
		{
			id: "b4",
			title: "Transfer to BML Savings",
			date: "2026-11-14",
			amount: "1000.0000",
			overdue: false,
			subscription: null,
			account: "BML Current",
			estimate: false,
			transfer: true,
		},
	],
	bills_total: "2112.8000",
	card_payments: [
		{
			account_id: "c1",
			title: "BML Visa",
			date: "2026-11-11",
			amount: "4800.0000",
			overdue: false,
		},
	],
	card_payments_total: "4800.0000",
	reserved: [{ goal_id: "g1", name: "New laptop", amount: "1200.0000" }],
	reserved_total: "1200.0000",
	available: "-1112.8000",
	expected_income: "10000.0000",
	expected: [
		{
			id: "i1",
			title: "Salary",
			date: "2026-11-25",
			amount: "10000.0000",
			overdue: false,
			subscription: null,
			account: "BML Current",
			estimate: false,
			transfer: false,
		},
	],
	kept_apart: [],
};

// ── Salary rules ────────────────────────────────────────────────────────────────────────────────

/** Two rules: a fixed amount to one savings account, a share to a goal. */
export const salaryRulesDemo = [
	{
		id: "r1",
		target_type: "account",
		account_id: "a1",
		goal_id: null,
		created_at: "2026-10-01T09:00:00Z",
		target_name: "MIB Savings",
		mode: "fixed",
		value: "1000.0000",
		auto: true,
	},
	{
		id: "r2",
		target_type: "goal",
		account_id: null,
		goal_id: "g1",
		created_at: "2026-10-01T09:00:00Z",
		target_name: "New laptop",
		mode: "percent",
		value: "10.0000",
		auto: false,
	},
] satisfies SalaryRule[];

// ── Budget ──────────────────────────────────────────────────────────────────────────────────────

const limit = (
	name: string,
	category: string,
	kind: "need" | "want",
	amount: string,
	activity: string,
	available: string,
	percent: number,
	status: BudgetLine["status"],
): BudgetLine => ({
	id: name,
	name,
	categories: [{ id: category, name: category }],
	amount,
	rollover: false,
	warn_percent: null,
	carried: "0.0000",
	moved_in: "0.0000",
	moved_out: "0.0000",
	activity,
	available,
	percent,
	status,
	kind,
});

/** Four limits for a month: two on track, one close and one over. */
export const budgetDemo: Budget = {
	currency: "MVR",
	period_start_day: 1,
	warn_percent: 80,
	period: { start: "2026-11-01", end: "2026-11-30", is_current: true },
	lines: [
		limit("Groceries", "Groceries", "need", "1600.0000", "295.9900", "1304.0100", 18, "ok"),
		limit("Eating out", "Dining", "want", "600.0000", "522.3000", "77.7000", 87, "warning"),
		limit("Getting around", "Transport", "need", "500.0000", "90.0000", "410.0000", 18, "ok"),
		limit(
			"Fun and shopping",
			"Shopping",
			"want",
			"900.0000",
			"1012.4000",
			"-112.4000",
			112,
			"over",
		),
	],
	totals: {
		amount: "3600.0000",
		activity: "1920.6900",
		available: "1679.3100",
		percent: 53,
		status: "ok",
	},
	attention: 2,
} as Budget;
