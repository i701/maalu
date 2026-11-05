import { describe, expect, it } from "vitest";
import type { Card } from "#/types/api";
import {
	accountFitsCard,
	canRepayFrom,
	cardMethod,
	cardsOf,
	cardText,
	repaymentSeed,
} from "./cards";

const account = (id: string, name: string, group = "accounts") =>
	({ id, name, group, currency: "MVR" }) as Card["account"];
const card = (over: Partial<Card>): Card =>
	({
		id: "c1",
		name: "MIB Visa debit",
		last_digits: "2815",
		kind: "debit",
		account: account("a1", "MIB Current"),
		repay_account: null,
		...over,
	}) as Card;

describe("cardText", () => {
	it("shows the last digits when there are some", () => {
		expect(cardText({ name: "Visa", last_digits: "4164" })).toBe("Visa ••4164");
		expect(cardText({ name: "Visa", last_digits: null })).toBe("Visa");
	});
});

describe("cardMethod", () => {
	it("is the payment method of its kind", () => {
		expect(cardMethod("debit")).toBe("debit_card");
		expect(cardMethod("credit")).toBe("credit_card");
	});
});

describe("accountFitsCard", () => {
	it("ties a credit card to a credit card account and a debit card to anything but a debt", () => {
		expect(accountFitsCard("credit", "card")).toBe(true);
		expect(accountFitsCard("credit", "accounts")).toBe(false);
		expect(accountFitsCard("debit", "accounts")).toBe(true);
		expect(accountFitsCard("debit", "savings")).toBe(true);
		expect(accountFitsCard("debit", "card")).toBe(false);
		expect(accountFitsCard("debit", "loan")).toBe(false);
	});

	it("repays a credit card from anything but a debt", () => {
		expect(canRepayFrom("accounts")).toBe(true);
		expect(canRepayFrom("card")).toBe(false);
	});
});

describe("cardsOf", () => {
	it("splits the cards into the account's own and the credit cards it repays", () => {
		const bank = account("a2", "BML Current");
		const debit = card({ id: "d", account: bank });
		const credit = card({
			id: "c",
			kind: "credit",
			account: account("a3", "BML Credit", "card"),
			repay_account: bank,
		});
		const other = card({ id: "o" });
		const { own, repaid } = cardsOf([debit, credit, other], "a2");
		expect(own.map((c) => c.id)).toEqual(["d"]);
		expect(repaid.map((c) => c.id)).toEqual(["c"]);
	});
});

describe("repaymentSeed", () => {
	it("is a transfer from the repayment account into the card's account", () => {
		const bank = account("a2", "BML Current");
		const owed = account("a3", "BML Credit", "card");
		const seed = repaymentSeed(card({ kind: "credit", account: owed, repay_account: bank }))!;
		expect(seed.type).toBe("transfer");
		expect(seed.account?.id).toBe("a2");
		expect(seed.to_account?.id).toBe("a3");
	});

	it("is nothing for a debit card or a credit card with no repayment account", () => {
		expect(repaymentSeed(card({}))).toBeNull();
		expect(repaymentSeed(card({ kind: "credit" }))).toBeNull();
	});
});
