import { describe, expect, it } from "vitest";
import { KIND_META, badgeText } from "./notifications";

describe("badgeText", () => {
	it("shows the number, and 9+ past nine", () => {
		expect(badgeText(1)).toBe("1");
		expect(badgeText(9)).toBe("9");
		expect(badgeText(10)).toBe("9+");
		expect(badgeText(250)).toBe("9+");
	});
});

describe("KIND_META", () => {
	it("labels every kind", () => {
		expect(Object.keys(KIND_META).toSorted()).toEqual([
			"budget_over",
			"budget_warning",
			"goal_reached",
			"installments_done",
			"payment_due",
			"payment_overdue",
		]);
	});
});
