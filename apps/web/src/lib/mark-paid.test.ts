import { describe, expect, it } from "vitest";
import { baseOf, payBody, sameRate } from "./mark-paid";

describe("baseOf", () => {
	it("multiplies exactly and rounds half to even at four decimals", () => {
		expect(baseOf("12", "15.6")).toBe("187.20");
		expect(baseOf("10", "15.4")).toBe("154.00");
		expect(baseOf("0.1", "0.2")).toBe("0.02");
		expect(baseOf("1", "15.12345678")).toBe("15.1235"); // 15.12345678 rounds up
		expect(baseOf("0.0001", "0.5")).toBe("0.00"); // 0.00005 rounds to even (0)
	});

	it("is null when a value is not a number", () => {
		expect(baseOf("", "15")).toBeNull();
		expect(baseOf("12", "abc")).toBeNull();
		expect(baseOf("-3", "15")).toBeNull();
	});
});

describe("sameRate", () => {
	it("compares as numbers", () => {
		expect(sameRate("15.4", "15.40000000")).toBe(true);
		expect(sameRate("15.4", "15.5")).toBe(false);
		expect(sameRate("", "15.4")).toBe(false);
	});
});

describe("payBody", () => {
	const base = { amount: "12", plannedRate: "15.4", rate: "15.4", charged: "", foreign: true };

	it("sends only the amount for a bill in the base currency", () => {
		expect(payBody({ ...base, foreign: false, rate: "99", charged: "50" })).toEqual({
			amount: "12",
		});
	});

	it("keeps the planned rate when it was not changed", () => {
		expect(payBody(base)).toEqual({ amount: "12" });
		expect(payBody({ ...base, rate: "15.40000000" })).toEqual({ amount: "12" });
	});

	it("sends a changed rate", () => {
		expect(payBody({ ...base, rate: "15.6" })).toEqual({ amount: "12", exchange_rate: "15.6" });
	});

	it("prefers what it really cost, and then sends no rate", () => {
		expect(payBody({ ...base, rate: "15.6", charged: "186" })).toEqual({
			amount: "12",
			base_amount: "186",
		});
	});

	it("ignores blanks", () => {
		expect(payBody({ ...base, rate: "  ", charged: " " })).toEqual({ amount: "12" });
	});
});
