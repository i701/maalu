import { describe, expect, it } from "vitest";
import { amountPrefix, candidateKey, confidenceText, everyText } from "./subscription-candidates";

describe("subscription candidates", () => {
	it("says how often in words", () => {
		expect(everyText("month", 1)).toBe("every month");
		expect(everyText("month", 3)).toBe("every 3 months");
		expect(everyText("week", 1)).toBe("every week");
		expect(everyText("year", 1)).toBe("every year");
	});

	it("says how sure it is in words", () => {
		expect(confidenceText({ confidence: "high" })).toBe("Looks regular");
		expect(confidenceText({ confidence: "medium" })).toBe("Looser fit");
	});

	it("keys a suggestion by vendor and currency", () => {
		expect(candidateKey({ vendor_id: "v1", currency: "USD" })).toBe("v1:USD");
	});

	it("calls the amount of a varying bill approximate", () => {
		expect(amountPrefix({ amount_varies: true })).toBe("about ");
		expect(amountPrefix({ amount_varies: false })).toBe("");
	});
});
