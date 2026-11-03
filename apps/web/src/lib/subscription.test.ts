import { describe, expect, it } from "vitest";
import {
	installmentsFromField,
	installmentsText,
	remindFromField,
	remindToField,
} from "./subscription";

describe("installmentsText", () => {
	it("says how many of the payments are done", () => {
		expect(installmentsText(12, 3)).toBe("3 of 12 paid");
		expect(installmentsText(12, 0)).toBe("0 of 12 paid");
	});
	it("never counts past the end", () => {
		expect(installmentsText(2, 5)).toBe("2 of 2 paid");
	});
	it("is nothing for a subscription with no end", () => {
		expect(installmentsText(null, 7)).toBeNull();
	});
});

describe("installmentsFromField", () => {
	it("is empty for blank and a number otherwise", () => {
		expect(installmentsFromField("")).toBeNull();
		expect(installmentsFromField("  ")).toBeNull();
		expect(installmentsFromField("12")).toBe(12);
	});
});

describe("the reminder select", () => {
	it("maps never to null and the day itself to 0", () => {
		expect(remindFromField("")).toBeNull();
		expect(remindFromField("0")).toBe(0);
		expect(remindFromField("7")).toBe(7);
	});
	it("shows what is stored, and falls back for a value the list lacks", () => {
		expect(remindToField(null)).toBe("");
		expect(remindToField(0)).toBe("0");
		expect(remindToField(14)).toBe("14");
		expect(remindToField(4)).toBe("3");
	});
});
