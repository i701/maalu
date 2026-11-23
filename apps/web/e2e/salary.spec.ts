import { expect, test } from "@playwright/test";
import { apiAs, open, openTransaction, signUp } from "./helpers";

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
	// only the cashback can be a refund: the button is in a transaction's sheet
	const link = page.getByRole("button", { name: "Link to a purchase" });
	await openTransaction(page, /Salary/);
	await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
	await expect(link).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("button", { name: "Edit" })).toBeHidden();
	await openTransaction(page, /Cashback/);
	await expect(link).toHaveCount(1);
});
