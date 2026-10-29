import { describe, expect, it } from "vitest";
import { daysBetween, dueLabel, isFuture, isOverdue, localToday } from "./planned";

describe("localToday", () => {
	it("is a plain YYYY-MM-DD date", () => {
		expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe("daysBetween", () => {
	it("counts whole days in either direction", () => {
		expect(daysBetween("2026-03-01", "2026-03-06")).toBe(5);
		expect(daysBetween("2026-03-06", "2026-03-01")).toBe(-5);
		expect(daysBetween("2026-03-01", "2026-03-01")).toBe(0);
	});

	it("is not thrown off by month ends, leap days or daylight saving", () => {
		expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
		expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2); // 2028 is a leap year
		expect(daysBetween("2026-03-28", "2026-04-01")).toBe(4);
	});
});

describe("isOverdue", () => {
	const today = "2026-03-10";

	it("is a planned transaction whose date has passed", () => {
		expect(isOverdue({ planned: true, transaction_date: "2026-03-09" }, today)).toBe(true);
	});

	it("is not overdue on the day itself, or later", () => {
		expect(isOverdue({ planned: true, transaction_date: today }, today)).toBe(false);
		expect(isOverdue({ planned: true, transaction_date: "2026-03-11" }, today)).toBe(false);
	});

	it("never applies to a posted transaction", () => {
		expect(isOverdue({ planned: false, transaction_date: "2026-01-01" }, today)).toBe(false);
	});
});

describe("isFuture", () => {
	it("is true only for a date after today", () => {
		expect(isFuture("2026-03-11", "2026-03-10")).toBe(true);
		expect(isFuture("2026-03-10", "2026-03-10")).toBe(false);
		expect(isFuture("2026-03-09", "2026-03-10")).toBe(false);
	});
});

describe("dueLabel", () => {
	const today = "2026-03-10";

	it("says when it is due", () => {
		expect(dueLabel("2026-03-10", today)).toBe("Due today");
		expect(dueLabel("2026-03-11", today)).toBe("Due tomorrow");
		expect(dueLabel("2026-03-15", today)).toBe("Due in 5 days");
	});

	it("says how late it is", () => {
		expect(dueLabel("2026-03-09", today)).toBe("1 day overdue");
		expect(dueLabel("2026-03-05", today)).toBe("5 days overdue");
	});
});
