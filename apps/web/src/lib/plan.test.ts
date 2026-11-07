import { describe, expect, it } from "vitest";
import type { AvailableToSpend } from "#/types/api";
import { dayLabel, firstShortRow, planDays, startingPoint } from "./plan";

const bill = (
	id: string,
	date: string,
	amount: string,
	over: Partial<AvailableToSpend["bills"][number]> = {},
) => ({
	id,
	title: id,
	date,
	amount,
	overdue: false,
	subscription: null,
	account: "Main",
	estimate: false,
	transfer: false,
	...over,
});

const plan = (over: Partial<AvailableToSpend> = {}): AvailableToSpend =>
	({
		currency: "MVR",
		today: "2026-11-05",
		balance: "1000.0000",
		reserved_total: "200.0000",
		bills: [],
		expected: [],
		...over,
	}) as AvailableToSpend;

describe("startingPoint", () => {
	it("is what the accounts hold less what is set aside, exactly", () => {
		expect(startingPoint({ balance: "1000.10", reserved_total: "200.05" })).toBe("800.05");
		expect(startingPoint({ balance: "100", reserved_total: "250" })).toBe("-150.00");
	});
});

describe("planDays with planned transfers", () => {
	it("lists a transfer out among the bills, marked as a transfer", () => {
		const days = planDays(
			plan({
				bills: [
					bill("Transfer to Pot", "2026-11-06", "300", { transfer: true }),
					bill("rent", "2026-11-07", "100"),
				],
			}),
		);
		const rows = days.flatMap((d) => d.rows);
		expect(rows.map((r) => [r.title, r.transfer, r.left])).toEqual([
			["Transfer to Pot", true, "500.00"],
			["rent", false, "400.00"],
		]);
	});
});

describe("planDays with credit card statements", () => {
	const statement = (over = {}) => ({
		account_id: "visa",
		title: "Visa",
		date: "2026-11-09",
		amount: "250",
		overdue: false,
		...over,
	});

	it("lists a statement among the bills and takes it off the running figure", () => {
		const days = planDays(
			plan({
				bills: [bill("rent", "2026-11-06", "100"), bill("wifi", "2026-11-12", "50")],
				card_payments: [statement()],
			}),
		);
		const rows = days.flatMap((d) => d.rows);
		expect(rows.map((r) => r.title)).toEqual(["rent", "Visa card payment", "wifi"]);
		expect(rows.map((r) => r.left)).toEqual(["700.00", "450.00", "400.00"]);
		expect(rows[1]).toMatchObject({ kind: "card", cardId: "visa", account: null });
		expect(rows[0].cardId).toBeNull();
	});

	it("can be where the money runs out", () => {
		const days = planDays(plan({ card_payments: [statement({ amount: "900" })] }));
		expect(firstShortRow(days)?.title).toBe("Visa card payment");
	});

	it("puts an overdue statement with the overdue bills", () => {
		const days = planDays(
			plan({ card_payments: [statement({ overdue: true, date: "2026-11-01" })] }),
		);
		expect(days[0]).toMatchObject({ key: "overdue", overdue: true });
	});
});

describe("planDays", () => {
	it("takes each bill off the running figure, in date order", () => {
		const days = planDays(
			plan({ bills: [bill("b", "2026-11-12", "300"), bill("a", "2026-11-06", "100.5")] }),
		);
		expect(days.map((d) => d.key)).toEqual(["2026-11-06", "2026-11-12"]);
		expect(days[0].rows[0].left).toBe("699.50");
		expect(days[1].rows[0].left).toBe("399.50");
	});

	it("puts overdue bills first, together", () => {
		const days = planDays(
			plan({
				bills: [
					bill("later", "2026-11-20", "10"),
					bill("late1", "2026-10-30", "10", { overdue: true }),
					bill("late2", "2026-11-02", "10", { overdue: true }),
				],
			}),
		);
		expect(days[0]).toMatchObject({ key: "overdue", overdue: true, date: null });
		expect(days[0].rows.map((r) => r.id)).toEqual(["late1", "late2"]);
		expect(days[1].key).toBe("2026-11-20");
	});

	it("groups bills that fall on the same day", () => {
		const days = planDays(
			plan({ bills: [bill("a", "2026-11-06", "10"), bill("b", "2026-11-06", "20")] }),
		);
		expect(days).toHaveLength(1);
		expect(days[0].rows.map((r) => r.left)).toEqual(["790.00", "770.00"]);
	});

	it("lists income on its day without adding it", () => {
		const days = planDays(
			plan({
				bills: [bill("rent", "2026-11-10", "900")],
				expected: [bill("pay", "2026-11-08", "9000")],
			}),
		);
		const pay = days[0].rows[0];
		expect(pay).toMatchObject({ kind: "income", left: null, short: false });
		// the bill after it still starts from 800, because the salary has not arrived
		expect(days[1].rows[0].left).toBe("-100.00");
	});

	it("marks where the money runs out, once", () => {
		const days = planDays(
			plan({
				bills: [
					bill("a", "2026-11-06", "500"),
					bill("b", "2026-11-07", "400"),
					bill("c", "2026-11-08", "50"),
				],
			}),
		);
		const rows = days.flatMap((d) => d.rows);
		expect(rows.map((r) => r.short)).toEqual([false, true, true]);
		expect(rows.map((r) => r.firstShort)).toEqual([false, true, false]);
		expect(firstShortRow(days)?.id).toBe("b");
	});

	it("carries the estimate flag, so a varying bill can be shown as a guess", () => {
		const days = planDays(
			plan({
				bills: [
					bill("vps", "2026-11-06", "100", { estimate: true }),
					bill("rent", "2026-11-07", "10"),
				],
			}),
		);
		expect(days.flatMap((d) => d.rows.map((r) => r.estimate))).toEqual([true, false]);
	});

	it("is empty when nothing is planned", () => {
		expect(planDays(plan())).toEqual([]);
		expect(firstShortRow([])).toBeNull();
	});
});

describe("dayLabel", () => {
	const day = (date: string | null) => ({ key: date ?? "overdue", overdue: !date, date, rows: [] });

	it("says overdue, today and tomorrow in words", () => {
		expect(dayLabel(day(null), "2026-11-05")).toBe("Overdue");
		expect(dayLabel(day("2026-11-05"), "2026-11-05")).toBe("Today");
		expect(dayLabel(day("2026-11-06"), "2026-11-05")).toBe("Tomorrow");
	});

	it("names any other day", () => {
		expect(dayLabel(day("2026-11-12"), "2026-11-05")).toMatch(/^Thu,? 12 Nov$/);
	});
});
