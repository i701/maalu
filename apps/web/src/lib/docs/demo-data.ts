import type { CardStatement } from "#/types/api";

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
