import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("a limit warns when spending gets close and again when it is passed", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	// the category has to exist before a limit can be put on it
	await api.transaction({
		type: "expense",
		amount: "10.00",
		account_id: id,
		category: "Groceries",
		description: "Milk",
	});

	await open(page, "/budget");
	await page.getByRole("button", { name: "Add limit" }).click();
	const dialog = page.getByRole("dialog", { name: "Add limit" });
	await dialog.getByLabel("Name").fill("Food");
	await dialog.getByRole("combobox", { name: "Categories" }).click();
	await page.getByRole("option", { name: "Groceries" }).click();
	await dialog.getByLabel("Limit per period (MVR)").fill("100");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	// 10 of 100 spent: on track, and nothing to warn about
	await expect(page.getByText("On track").first()).toBeVisible();
	await open(page, "/transactions");
	await expect(page.getByText("Milk")).toBeVisible();
	await expect(page.getByText(/of its limit/)).toBeHidden();

	// 90 of 100 spent: past the 80% warning level
	await api.transaction({
		type: "expense",
		amount: "80.00",
		account_id: id,
		category: "Groceries",
	});
	await open(page, "/budget");
	await expect(page.getByText(/Close to limit/).first()).toBeVisible();
	await open(page, "/transactions");
	await expect(page.getByText("Food is at 90% of its limit")).toBeVisible();

	// 120 of 100 spent: over
	await api.transaction({
		type: "expense",
		amount: "30.00",
		account_id: id,
		category: "Groceries",
	});
	await open(page, "/budget");
	await expect(page.getByText(/Over the limit/).first()).toBeVisible();
	await expect(page.getByText(/20\.00 over/)).toBeVisible();
	await open(page, "/transactions");
	await expect(page.getByText(/Food is over its limit by MVR\s20\.00/)).toBeVisible();
});
