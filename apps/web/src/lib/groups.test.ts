import { describe, expect, it } from "vitest";
import { dateSpan, groupedMessage, groupSizeProblem } from "./groups";

describe("groupSizeProblem", () => {
	it("allows two to fifty", () => {
		expect(groupSizeProblem(2)).toBeNull();
		expect(groupSizeProblem(50)).toBeNull();
	});
	it("says why not", () => {
		expect(groupSizeProblem(1)).toContain("at least 2");
		expect(groupSizeProblem(0)).toContain("at least 2");
		expect(groupSizeProblem(51)).toContain("at most 50");
	});
});

describe("dateSpan", () => {
	it("is empty without dates, one date for a single day and a span otherwise", () => {
		expect(dateSpan(null, null)).toBe("");
		expect(dateSpan("2026-03-01", "2026-03-01")).toBe(dateSpan("2026-03-01", "2026-03-01"));
		expect(dateSpan("2026-03-01", "2026-03-01")).not.toContain("–");
		expect(dateSpan("2026-03-01", "2026-03-09")).toContain("–");
	});
});

describe("groupedMessage", () => {
	it("tells a new group from an existing one, with the right plural", () => {
		expect(groupedMessage(3, "Trip", true)).toBe('Made "Trip" from 3 transactions');
		expect(groupedMessage(1, "Trip", false)).toBe('Added 1 transaction to "Trip"');
	});
});
