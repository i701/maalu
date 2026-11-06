import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test("an account's page lists its own transactions, a transfer from each side", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "1000");
	const savings = await api.account("Savings", "0", "savings");
	await api.transaction({
		type: "expense",
		amount: "120.00",
		account_id: main.id,
		category: "Groceries",
		description: "Weekly shop",
		transaction_date: today(),
	});
	await api.transaction({
		type: "transfer",
		amount: "300.00",
		account_id: main.id,
		to_account_id: savings.id,
		description: "Monthly saving",
		transaction_date: today(),
	});
	await api.transaction({
		type: "expense",
		amount: "9.00",
		account_id: savings.id,
		category: "Fees",
		description: "Bank fee",
		transaction_date: today(),
	});

	// the name on the Accounts list opens the page
	await open(page, "/accounts");
	await page.getByRole("link", { name: "Main", exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`/accounts/${main.id}`));
	await expect(page.getByRole("heading", { name: "Main" })).toBeVisible();

	// only this account's rows: its expense and the transfer leaving it, not the savings account's fee
	await expect(page.getByText("Weekly shop")).toBeVisible();
	await expect(page.getByText("To Savings")).toBeVisible();
	await expect(page.getByText("Bank fee")).toBeHidden();
	await expect(page.getByText("2 transactions")).toBeVisible();

	// the same transfer reads as money coming in on the other side
	await open(page, `/accounts/${savings.id}`);
	await expect(page.getByText("From Main")).toBeVisible();
	await expect(page.getByText("Bank fee")).toBeVisible();
	await expect(page.getByText("Weekly shop")).toBeHidden();
});

test("an account's page can search, and adding a transaction starts in that account", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "500");
	await api.account("Other", "500");
	for (const description of ["Coffee beans", "Bus ticket"])
		await api.transaction({
			type: "expense",
			amount: "10.00",
			account_id: main.id,
			category: "Misc",
			description,
			transaction_date: today(),
		});

	await open(page, `/accounts/${main.id}`);
	await page.getByRole("searchbox").fill("coffee");
	await expect(page.getByText("Coffee beans")).toBeVisible();
	await expect(page.getByText("Bus ticket")).toBeHidden();

	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await expect(form.getByRole("combobox", { name: "Account" })).toContainText("Main");
});

test("an account that does not exist says so", async ({ page }) => {
	await signUp(page);
	await open(page, "/accounts/00000000-0000-4000-8000-000000000000");
	await expect(page.getByText("There is no account with that address.")).toBeVisible();
	await page.getByRole("link", { name: "See your accounts" }).click();
	await expect(page).toHaveURL(/\/accounts$/);
});
