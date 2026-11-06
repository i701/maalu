import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** A date in the month `monthsAgo` before this one, as YYYY-MM-DD. */
function inMonth(monthsAgo: number, day = 10): string {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthsAgo, day))
		.toISOString()
		.slice(0, 10);
}

/** Groceries (a need) and Games (a want), last month and the month before. */
async function sorted(
	page: import("@playwright/test").Page,
	request: import("@playwright/test").APIRequestContext,
) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	await api.post("/categories", { name: "Groceries", kind: "need" });
	await api.post("/categories", { name: "Games", kind: "want" });
	const spend = (amount: string, category: string, monthsAgo: number) =>
		api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category,
			transaction_date: inMonth(monthsAgo),
		});
	await spend("100.00", "Groceries", 2);
	await spend("300.00", "Groceries", 1);
	await spend("50.00", "Games", 1);
}

test("Compare holds needs and wants across the two periods", async ({ page, request }) => {
	test.setTimeout(60_000);
	await sorted(page, request);
	await open(page, "/compare"); // last month against the month before it

	await expect(page.getByText("Needs and wants")).toBeVisible();
	// Needs went from 100 to 300; Wants had nothing before and 50 now
	await expect(page.getByText("Needs", { exact: true })).toBeVisible();
	await expect(page.getByText("Wants", { exact: true })).toBeVisible();
	await expect(page.getByText(/MVR\s100\.00 → MVR\s300\.00/).first()).toBeVisible();
	await expect(page.getByText(/MVR\s0\.00 → MVR\s50\.00/).first()).toBeVisible();
});

test("Trends adds a needs and wants table by month under the categories", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	await sorted(page, request);
	await open(page, "/trends");

	const table = page.getByRole("table", { name: "Needs and wants by month" });
	await expect(table).toBeVisible();
	await expect(table.getByRole("row", { name: /Needs/ })).toContainText("400");
	await expect(table.getByRole("row", { name: /Wants/ })).toContainText("50");

	// only spending is split this way
	await page.getByRole("button", { name: "Income" }).click();
	await expect(page.getByRole("table", { name: "Needs and wants by month" })).toBeHidden();
});
