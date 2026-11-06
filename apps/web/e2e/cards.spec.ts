import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type Account = { id: string; balance: string };
type Card = { id: string };
type Tx = { id: string; payment_method: string; card: { name: string } | null };

test("a debit card is added on its account and picked on a purchase", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const bank = await api.account("MIB Current", "1000");

	// add the card on the account's page
	await open(page, `/accounts/${bank.id}`);
	await page.getByRole("button", { name: "Add debit card" }).click();
	const dialog = page.getByRole("dialog", { name: "Add debit card" });
	await expect(dialog.getByText("spends from MIB Current")).toBeVisible();
	await dialog.getByLabel("Name").fill("MIB Visa debit");
	await dialog.getByLabel("Last 4 digits").fill("2815");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("MIB Visa debit ••2815", { exact: true })).toBeVisible();

	// pick it on a new transaction: the account and the method follow
	await page.getByRole("button", { name: "Add transaction" }).click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByLabel("Amount").fill("120");
	// cards are for spending: an income does not offer one
	await form.getByRole("button", { name: "Income" }).click();
	await expect(form.getByRole("combobox", { name: "Card" })).toBeHidden();
	await form.getByRole("button", { name: "Expense" }).click();
	await form.getByRole("combobox", { name: "Card" }).click();
	await page.getByRole("option", { name: /MIB Visa debit/ }).click();
	await expect(form.getByRole("combobox", { name: "Payment method" })).toHaveText("Debit card");
	await form.getByRole("combobox", { name: /^Category/ }).fill("Groceries");
	await page.getByRole("option", { name: "Groceries" }).click();
	await form.getByRole("button", { name: "Save", exact: true }).click();
	await expect(form).toBeHidden();

	// the row names the card, and the money came out of the account
	// (once in the list of cards, once under the transaction)
	await expect(page.getByText("MIB Visa debit ••2815", { exact: true })).toHaveCount(2);
	const [tx] = await api.get<Tx[]>("/transactions");
	expect(tx.payment_method).toBe("debit_card");
	expect(tx.card?.name).toBe("MIB Visa debit");
	expect((await api.get<Account>(`/accounts/${bank.id}`)).balance).toBe("880.0000");
});

test("the Transactions page can show only one card's spending", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const bank = await api.account("BML Current", "5000");
	const visa = await api.post<Card>("/cards", {
		name: "BML Visa",
		kind: "debit",
		account_id: bank.id,
	});
	await api.transaction({
		type: "expense",
		amount: "75",
		account_id: bank.id,
		card_id: visa.id,
		description: "Paid by card",
	});
	await api.transaction({
		type: "expense",
		amount: "30",
		account_id: bank.id,
		description: "Paid by transfer",
	});

	await open(page, "/transactions");
	await expect(page.getByText("Paid by transfer")).toBeVisible();
	// on a narrower screen the filters open from a button
	await page.getByRole("button", { name: /Filters/ }).click();
	await page.getByRole("combobox", { name: "Card" }).click();
	await page.getByRole("option", { name: "BML Visa" }).click();

	await expect(page.getByText("Paid by card")).toBeVisible();
	await expect(page.getByText("Paid by transfer")).toBeHidden();
});

test("a credit card is its own account: spending is owed, and Repay moves money from the bank", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const bank = await api.account("BML Current", "2000");
	const owed = await api.account("BML Credit", "0", "card");
	const credit = await api.post<Card>("/cards", {
		name: "BML Visa credit",
		kind: "credit",
		last_digits: "0003",
		account_id: owed.id,
		repay_account_id: bank.id,
	});
	await api.transaction({
		type: "expense",
		amount: "350",
		card_id: credit.id,
		description: "Dinner",
	});

	// what was spent is owed on the card account; the bank account is untouched until it is repaid
	expect((await api.get<Account>(`/accounts/${owed.id}`)).balance).toBe("-350.0000");
	expect((await api.get<Account>(`/accounts/${bank.id}`)).balance).toBe("2000.0000");

	await open(page, `/accounts/${owed.id}`);
	await expect(page.getByText("BML Visa credit ••0003", { exact: true })).toBeVisible();
	await expect(page.getByText("Repaid from BML Current")).toBeVisible();

	// Repay opens a transfer from the bank into the card, ready for the amount
	await page.getByRole("button", { name: "Repay", exact: true }).click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await expect(form.getByRole("button", { name: "Transfer" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(form.getByLabel("Description")).toHaveValue("BML Visa credit repayment");
	await form.getByLabel("Amount").fill("350");
	await form.getByRole("button", { name: "Save", exact: true }).click();
	await expect(form).toBeHidden();

	await expect
		.poll(async () => (await api.get<Account>(`/accounts/${owed.id}`)).balance)
		.toBe("0.0000");
	expect((await api.get<Account>(`/accounts/${bank.id}`)).balance).toBe("1650.0000");
});

test("choosing an account group explains it, and a debit card is not one", async ({ page }) => {
	await signUp(page);
	await open(page, "/accounts");
	await page.getByRole("button", { name: "Add account" }).click();
	const dialog = page.getByRole("dialog", { name: "Add account" });

	await dialog.getByLabel("Group").click();
	// the old Debit Card group is gone: a debit card belongs to its bank account
	await expect(page.getByRole("option", { name: "Debit Card" })).toBeHidden();
	await page.getByRole("option", { name: "Bank accounts" }).click();
	await expect(dialog.getByText(/Its debit card is part of it/)).toBeVisible();

	await dialog.getByLabel("Group").click();
	await page.getByRole("option", { name: "Credit cards" }).click();
	await expect(dialog.getByText(/what you owe/)).toBeVisible();
});
