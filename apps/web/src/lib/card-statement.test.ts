import { describe, expect, it } from "vitest";
import type { CardStatement } from "#/types/api";
import { dueIn, ordinal, scheduleText, statementLine, statementStatus } from "./card-statement";

/** Money is written with a non-breaking space; compare with a plain one. */
const plain = (s: string) => s.replaceAll("\u00a0", " ");

const statement = (over: Partial<CardStatement> = {}): CardStatement => ({
	account_id: "a",
	account_name: "Visa",
	currency: "MVR",
	statement_day: 5,
	due_day: 25,
	closed_on: "2026-11-05",
	due_on: "2026-11-25",
	next_closes_on: "2026-12-05",
	statement_balance: "600.0000",
	paid_since: "0.0000",
	remaining: "600.0000",
	remaining_base: "600.0000",
	spent_since: "100.0000",
	owed_now: "700.0000",
	credit_limit: null,
	state: "due",
	days_until_due: 10,
	...over,
});

describe("ordinal", () => {
	it("says days of the month", () => {
		expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinal)).toEqual([
			"1st",
			"2nd",
			"3rd",
			"4th",
			"11th",
			"12th",
			"13th",
			"21st",
			"22nd",
			"23rd",
			"30th",
			"31st",
		]);
	});
});

describe("dueIn", () => {
	it("says how far away a date is", () => {
		expect(dueIn(0)).toBe("today");
		expect(dueIn(1)).toBe("tomorrow");
		expect(dueIn(4)).toBe("in 4 days");
		expect(dueIn(-1)).toBe("yesterday");
		expect(dueIn(-3)).toBe("3 days ago");
	});
});

describe("statementStatus", () => {
	it("is calm when there is time and loud when it is late", () => {
		expect(statementStatus(statement())).toEqual({ label: "To pay", tone: "ok" });
		expect(statementStatus(statement({ days_until_due: 2 }))).toEqual({
			label: "Due soon",
			tone: "warn",
		});
		expect(statementStatus(statement({ state: "overdue", days_until_due: -2 }))).toEqual({
			label: "Payment overdue",
			tone: "late",
		});
		expect(statementStatus(statement({ state: "paid" })).label).toBe("Paid");
		expect(statementStatus(statement({ state: "none" })).tone).toBe("quiet");
	});
});

describe("statementLine", () => {
	it("tells what to pay and by when", () => {
		expect(plain(statementLine(statement()))).toMatch(/^Pay MVR 600\.00 by .* \(in 10 days\)$/);
	});

	it("says when it was due once late", () => {
		expect(plain(statementLine(statement({ state: "overdue", days_until_due: -2 })))).toMatch(
			/^MVR 600\.00 was due .* \(2 days ago\)$/,
		);
	});

	it("says it is paid, or that nothing is owed", () => {
		expect(plain(statementLine(statement({ state: "paid", remaining: "0.0000" })))).toBe(
			"Statement of MVR 600.00 paid",
		);
		expect(plain(statementLine(statement({ state: "none" })))).toMatch(
			/^Nothing to pay\. Next statement/,
		);
	});
});

describe("scheduleText", () => {
	it("reads the two days", () => {
		expect(scheduleText({ statement_day: 5, due_day: 22 })).toBe(
			"Closes on the 5th, due on the 22nd",
		);
	});
});
