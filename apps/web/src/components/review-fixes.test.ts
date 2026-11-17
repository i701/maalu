import { describe, expect, it } from "vitest";
import { groupSchema } from "#/server/groups";
import { subscriptionFormFields } from "#/server/subscriptions";
import { refundSchema } from "./refund-form";

const item = (id: string, amount: string, on = true) => ({
	id,
	name: id,
	category: "Food",
	left: "50",
	amount,
	on,
});
const refund = (items: ReturnType<typeof item>[]) => ({
	amount: "",
	items,
	transaction_date: "2026-11-17",
	transaction_time: "",
	account_id: "",
	exchange_rate: "",
	description: "",
});
const problems = (v: ReturnType<typeof refund>) => {
	const result = refundSchema(true, false).safeParse(v);
	return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("refundSchema with items", () => {
	it("needs an amount on every ticked item, and none on the others", () => {
		expect(problems(refund([item("a", ""), item("b", "10")]))).toEqual([
			"items.0.amount: Enter an amount",
		]);
		expect(problems(refund([item("a", "", false), item("b", "10")]))).toEqual([]);
	});
});

describe("groupSchema", () => {
	it("clears a blank note but leaves out one that was not sent", () => {
		expect(groupSchema.parse({ name: "Trip", note: "  " }).note).toBeNull();
		expect(groupSchema.partial({ name: true }).parse({ name: "Trip" })).not.toHaveProperty(
			"note",
			null,
		);
	});
});

describe("subscriptionFormFields", () => {
	it("says to give a blank name one", () => {
		const result = subscriptionFormFields.name.safeParse("  ");
		expect(result.success ? null : result.error.issues[0]?.message).toBe("Give it a name");
	});
});
