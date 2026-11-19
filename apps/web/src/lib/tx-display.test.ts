import { describe, expect, it } from "vitest";
import { makeTransaction } from "#/test/fixtures";
import { dayHeading, txRowLine, txRowTitle } from "./tx-display";

describe("dayHeading", () => {
	it("names today, yesterday and tomorrow, and writes any other day out", () => {
		expect(dayHeading("2026-11-19", "2026-11-19")).toBe("Today");
		expect(dayHeading("2026-11-18", "2026-11-19")).toBe("Yesterday");
		expect(dayHeading("2026-11-20", "2026-11-19")).toBe("Tomorrow");
		expect(dayHeading("2026-11-15", "2026-11-19")).toBe("15 Nov 2026");
	});
});

describe("a transaction's row", () => {
	it("is titled by its vendor, else its description, else its category", () => {
		const plain = makeTransaction({ vendor: null, description: "", category: "Food" });
		expect(txRowTitle(plain)).toBe("Food");
		expect(txRowTitle({ ...plain, description: "Lunch" })).toBe("Lunch");
	});

	it("has one quiet line: the category and how it was paid", () => {
		const t = makeTransaction({ category: "Food", payment_method: "cash", card: null });
		expect(txRowLine(t)).toBe("Food · Cash");
		expect(txRowLine({ ...t, type: "transfer" })).toBe("Transfer");
	});
});
