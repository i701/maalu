import { describe, expect, it } from "vitest";
import { bankBrand } from "./banks";

describe("bankBrand", () => {
	it("knows MIB and BML whatever the case or spacing", () => {
		expect(bankBrand("MIB")?.accent).toBe("#006A4D");
		expect(bankBrand(" bml ")?.accent).toBe("#E21B23");
		expect(bankBrand("Bml")?.logo).toBe(bankBrand("BML")?.logo);
	});

	it("gives MIB and BML their own logos", () => {
		expect(bankBrand("MIB")?.logo).not.toBe(bankBrand("BML")?.logo);
	});

	it("has no brand for any other bank, or none", () => {
		expect(bankBrand("SBI")).toBeNull();
		expect(bankBrand("")).toBeNull();
		expect(bankBrand(null)).toBeNull();
		expect(bankBrand(undefined)).toBeNull();
	});
});
