import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const day = () =>
	new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().slice(0, 10);

test("pay in the Salary category cannot be linked to a purchase, other income can", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	const base = { account_id: id, transaction_date: day() };
	await api.transaction({ type: "expense", amount: "100.00", category: "Food", ...base });
	await api.transaction({ type: "income", amount: "100.00", category: "Salary", ...base });
	await api.transaction({ type: "income", amount: "100.00", category: "Cashback", ...base });

	await open(page, "/transactions");
	await expect(page.getByText("Cashback").first()).toBeVisible();
	// three rows, but only the cashback can be a refund
	await expect(page.getByRole("button", { name: "Link to a purchase" })).toHaveCount(1);
});

test("every account has a Salary category that cannot be deleted or merged away", async ({
	page,
}) => {
	await signUp(page);
	await open(page, "/categories");
	// the only category a new account has
	await expect(page.getByText("Default · pay")).toBeVisible();
	await expect(page.getByRole("button", { name: "Delete" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Merge into another category" })).toBeDisabled();

	// its name stays, but its colour can be changed
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.getByLabel("Name")).toBeDisabled();
});
