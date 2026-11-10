import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** A date `n` days before today, as YYYY-MM-DD. */
function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("a charge that repeats is suggested, and adding it links the payments and plans the next", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const wallet = await api.account("Wallet", "5000");
	for (const days of [125, 95, 65, 35]) {
		await api.transaction({
			type: "expense",
			amount: "99.00",
			account_id: wallet.id,
			category: "Streaming",
			vendor_name: "Netflix",
			transaction_date: daysAgo(days),
		});
	}

	await open(page, "/subscriptions");
	await page.getByRole("button", { name: /Suggested subscriptions/ }).click();
	await expect(page.getByText(/every month · seen 4 times/)).toBeVisible();
	await page.getByRole("button", { name: "Add", exact: true }).click();

	const dialog = page.getByRole("dialog", { name: "Add as a subscription" });
	await expect(dialog.getByLabel("Name")).toHaveValue("Netflix");
	await dialog.getByRole("button", { name: "Add subscription" }).click();
	await expect(dialog).toBeHidden();

	// it is a subscription now, so it is no longer suggested, and the next payment is planned
	await expect(page.getByRole("button", { name: /Suggested subscriptions/ })).toHaveCount(0);
	await expect(page.getByText("Netflix").first()).toBeVisible();
	await open(page, "/transactions");
	await page.getByRole("button", { name: /^Upcoming/ }).click();
	await expect(page.getByText("Subscription").first()).toBeVisible();
});

test("Not a subscription stops a vendor being suggested", async ({ page, request }) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const wallet = await api.account("Wallet", "5000");
	for (const days of [125, 95, 65, 35]) {
		await api.transaction({
			type: "expense",
			amount: "30.00",
			account_id: wallet.id,
			category: "Fitness",
			vendor_name: "Gym",
			transaction_date: daysAgo(days),
		});
	}

	await open(page, "/subscriptions");
	await page.getByRole("button", { name: /Suggested subscriptions/ }).click();
	await page.getByRole("button", { name: "Not a subscription" }).click();
	await expect(page.getByRole("button", { name: /Suggested subscriptions/ })).toHaveCount(0);
});
