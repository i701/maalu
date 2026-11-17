import { describe, expect, it } from "vitest";
import { accountDefaults, accountSchema } from "./schema";

const check = (over: Partial<ReturnType<typeof accountDefaults>>) =>
	accountSchema("MVR").safeParse({ ...accountDefaults(undefined, "MVR"), name: "Visa", ...over });

describe("accountSchema", () => {
	it("checks the credit limit of a group that has one", () => {
		expect(check({ group: "card", credit_limit: "lots" }).success).toBe(false);
		expect(check({ group: "card", credit_limit: "10000" }).success).toBe(true);
	});

	it("ignores a limit left behind after switching to a group without one", () => {
		expect(check({ group: "cash", credit_limit: "lots" }).success).toBe(true);
	});
});
