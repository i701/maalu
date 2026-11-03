import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("a subscription plans its payment, which is paid with one click", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Wallet", "5000");

	await open(page, "/subscriptions");
	await page.getByRole("button", { name: "Add subscription" }).click();
	const dialog = page.getByRole("dialog", { name: "Add subscription" });
	await dialog.getByLabel("Name").fill("Netflix");
	await dialog.getByRole("combobox", { name: "Pay from" }).click();
	await page.getByRole("option", { name: /Wallet/ }).click();
	await dialog.getByLabel("Cost per cycle").fill("100");
	await dialog.getByRole("combobox", { name: "Category" }).fill("Entertainment");
	await dialog.getByRole("combobox", { name: "Category" }).press("Tab"); // closes the suggestions
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("Netflix").first()).toBeVisible();

	// the first payment is due today, so it is already planned in Upcoming
	await open(page, "/transactions");
	await page.getByRole("button", { name: /^Upcoming/ }).click();
	await expect(page.getByText("Subscription").first()).toBeVisible();
	await page.getByRole("button", { name: "Mark as paid" }).first().click();
	const paid = page.getByRole("dialog", { name: "Mark as paid" });
	await paid
		.getByRole("button", { name: /Mark as paid|Save/ })
		.last()
		.click();
	await expect(page.getByText(/marked as paid/)).toBeVisible();

	// it left the account (5000 less 100), and it counts as spending now
	await open(page, "/accounts");
	await expect(page.getByText("4,900.00").first()).toBeVisible();
});

test("a plan with one payment completes once it is paid", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const wallet = await api.account("Wallet", "5000");
	const sub = await api.subscription({
		name: "Phone instalment",
		amount: "250",
		account_id: wallet.id,
		installments_total: 1,
	});

	await open(page, "/transactions");
	await page.getByRole("button", { name: /^Upcoming/ }).click();
	await page.getByRole("button", { name: "Mark as paid" }).first().click();
	const paid = page.getByRole("dialog", { name: "Mark as paid" });
	await paid
		.getByRole("button", { name: /Mark as paid|Save/ })
		.last()
		.click();
	await expect(page.getByText(/marked as paid/)).toBeVisible();

	await open(page, "/subscriptions");
	await expect(page.getByText("Completed").first()).toBeVisible();
	await expect(page.getByText(/1 of 1 paid/)).toBeVisible();
	expect(sub.id).toBeTruthy();
});
