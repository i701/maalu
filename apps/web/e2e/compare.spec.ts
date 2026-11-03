import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** A date in the month `monthsAgo` before this one, as YYYY-MM-DD. */
function inMonth(monthsAgo: number, day = 10): string {
	const now = new Date();
	const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthsAgo, day));
	return d.toISOString().slice(0, 10);
}

test("comparing two months shows what moved and by how much", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	const spend = (amount: string, category: string, monthsAgo: number) =>
		api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category,
			transaction_date: inMonth(monthsAgo),
		});
	await spend("100.00", "Groceries", 2); // the month before last month
	await spend("300.00", "Groceries", 1); // last month: up by 200
	await spend("50.00", "Gym", 1); // new last month
	await spend("40.00", "Taxi", 2); // gone since
	await api.transaction({
		type: "income",
		amount: "1000.00",
		account_id: id,
		category: "Salary",
		transaction_date: inMonth(1),
	});

	await open(page, "/compare"); // last month against the month before it
	const before = new Date(
		Date.UTC(new Date().getFullYear(), new Date().getMonth() - 2, 1),
	).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
	await expect(
		page.getByText(
			new RegExp(
				`Spending is up MVR\\s210\\.00 \\(150%\\) on ${before}\\. Most of it: Groceries \\+MVR\\s200\\.00, Gym \\+MVR\\s50\\.00\\.`,
			),
		),
	).toBeVisible();

	// every category, with what it came to before and now, and what is new or gone
	await expect(page.getByText(/MVR\s100\.00 → MVR\s300\.00/)).toBeVisible();
	await expect(page.getByText(/· new/).first()).toBeVisible();
	await expect(page.getByText(/· none now/)).toBeVisible();

	// another pair of periods; this one has nothing in it
	await page.getByRole("button", { name: "Last 30 days" }).click();
	await expect(page).toHaveURL(/preset=last_30/);
	await expect(page.getByText(/Now: .* · Before: /)).toBeVisible();
});

test("a custom comparison waits until both ranges are complete", async ({ page }) => {
	await signUp(page);
	await open(page, "/compare?preset=custom");
	await expect(page.getByText("Pick both ranges to compare.")).toBeVisible();

	await page.getByLabel("Now: from").fill("2026-02-01");
	await page.getByLabel("Now: to").fill("2026-02-28");
	await page.getByLabel("Before: from").fill("2026-01-01");
	await page.getByLabel("Before: to").fill("2026-01-31");
	await expect(page.getByText(/Now: 01 Feb 2026 to 28 Feb 2026/)).toBeVisible();
});
