import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("adding an expense puts it in the list and takes it off the account", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Wallet", "1000");

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const dialog = page.getByRole("dialog", { name: "Add transaction" });
	await dialog.getByLabel("Amount").fill("12.50");
	await dialog.getByRole("combobox", { name: "Account" }).click();
	await page.getByRole("option", { name: /Wallet/ }).click();
	await dialog.getByRole("combobox", { name: "Category" }).fill("Coffee");
	await dialog.getByLabel("Description").fill("Flat white");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();

	await expect(dialog).toBeHidden();
	const row = page.getByText("Flat white").first();
	await expect(row).toBeVisible();
	await expect(page.getByText("12.50").first()).toBeVisible();

	await open(page, "/accounts");
	await expect(page.getByText("987.50").first()).toBeVisible(); // 1000 less 12.50
});

test("the search box narrows the list", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "1000");
	await api.transaction({
		type: "expense",
		amount: "5.00",
		account_id: id,
		description: "Bananas",
	});
	await api.transaction({ type: "expense", amount: "9.00", account_id: id, description: "Taxi" });

	await open(page, "/transactions");
	await expect(page.getByText("Bananas")).toBeVisible();
	await expect(page.getByText("Taxi")).toBeVisible();

	await page.getByRole("searchbox").fill("Taxi");
	await expect(page.getByText("Bananas")).toBeHidden();
	await expect(page.getByText("Taxi")).toBeVisible();
});

test("deleting a transaction moves it to the trash, and it can come back", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "100");
	await api.transaction({
		type: "expense",
		amount: "5.00",
		account_id: id,
		description: "Bananas",
	});

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Delete" }).first().click();
	const confirm = page.getByRole("dialog");
	if (await confirm.isVisible()) await confirm.getByRole("button", { name: /Delete|Move/ }).click();
	await expect(page.getByText("Bananas")).toBeHidden();

	await open(page, "/trash");
	await expect(page.getByText("Bananas")).toBeVisible();
});
