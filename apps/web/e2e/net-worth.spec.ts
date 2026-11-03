import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** A date `daysAgo` days before today, as YYYY-MM-DD. */
function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("net worth says how it moved and what moved it", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const wallet = await api.account("Wallet", "1000");
	const bank = await api.account("Bank", "0");
	const add = (type: string, amount: string, accountId: string, days: number) =>
		api.transaction({ type, amount, account_id: accountId, transaction_date: daysAgo(days) });
	await add("income", "500.00", wallet.id, 10);
	await add("expense", "200.00", wallet.id, 5);
	await add("income", "50.00", bank.id, 3);

	await open(page, "/net-worth"); // the last 30 days
	await expect(
		page.getByText(
			/Net worth rose MVR\s350\.00 \(35\.0%\), from MVR\s1,000\.00 to MVR\s1,350\.00\. You kept MVR\s350\.00 \(income less spending\)\./,
		),
	).toBeVisible();

	// the accounts, each with its own change
	await expect(page.getByText("Wallet").first()).toBeVisible();
	await expect(page.getByText("Bank").first()).toBeVisible();

	// the chart's bars are readable, and the table has the same figures
	await expect(page.getByRole("img", { name: /Income: \+MVR\s550\.00/ })).toBeVisible();
	await expect(page.getByRole("img", { name: /Spending: -MVR\s200\.00/ })).toBeVisible();
	await page.getByRole("button", { name: "Show as a table" }).click();
	const drivers = page.getByRole("table", { name: "What moved it" });
	await expect(drivers.getByRole("row", { name: /Income/ })).toContainText("550.00");
	await expect(drivers.getByRole("row", { name: /Spending/ })).toContainText("200.00");
});

test("a custom period waits for both dates", async ({ page }) => {
	await signUp(page);
	await open(page, "/net-worth?preset=custom");
	await expect(page.getByText("Pick a start and an end date, in order.")).toBeVisible();
	await page.getByLabel("From", { exact: true }).fill("2026-01-01");
	await page.getByLabel("To", { exact: true }).fill("2026-01-31");
	await expect(page.getByText("Net worth stayed at")).toBeVisible();
});
