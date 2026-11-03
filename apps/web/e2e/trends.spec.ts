import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** A date in the month `monthsAgo` before this one, as YYYY-MM-DD. */
function inMonth(monthsAgo: number, day = 10): string {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthsAgo, day))
		.toISOString()
		.slice(0, 10);
}

test("the trends table shows each category month by month, with totals", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	const add = (type: string, amount: string, category: string, monthsAgo: number) =>
		api.transaction({
			type,
			amount,
			account_id: id,
			category,
			transaction_date: inMonth(monthsAgo),
		});
	await add("expense", "120.50", "Groceries", 0);
	await add("expense", "300.00", "Groceries", 1);
	await add("expense", "80.00", "Gym", 1);
	await add("income", "2000.00", "Salary", 1);

	await open(page, "/trends");
	const table = page.getByRole("table", { name: "Spending by category and month" });
	const groceries = table.getByRole("row", { name: /Groceries/ });
	await expect(groceries).toContainText("120.50");
	await expect(groceries).toContainText("300.00");
	await expect(groceries).toContainText("420.50"); // the row's total
	await expect(table.getByRole("row", { name: /Gym/ })).toContainText("80.00");
	// last month: 300 + 80 across every category
	await expect(table.getByRole("row", { name: /All categories/ })).toContainText("380.00");

	await page.getByRole("button", { name: "Income" }).click();
	const income = page.getByRole("table", { name: "Income by category and month" });
	await expect(income.getByRole("row", { name: /Salary/ })).toContainText("2,000");
	await expect(page).toHaveURL(/kind=income/);

	await page.getByRole("button", { name: "6 months" }).click();
	await expect(page).toHaveURL(/months=6/);
	await expect(income.getByRole("columnheader")).toHaveCount(1 + 6 + 2); // name, months, total, average
});

test("with nothing recorded it says so", async ({ page }) => {
	await signUp(page);
	await open(page, "/trends");
	await expect(page.getByText(/No spending in these 12 months/)).toBeVisible();
});

test("the chart view stacks each month by category and reads out a column on hover", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	const add = (amount: string, category: string) =>
		api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category,
			transaction_date: inMonth(1),
		});
	await add("300.00", "Groceries");
	await add("80.00", "Gym");

	await open(page, "/trends");
	await page.getByRole("button", { name: "Chart" }).click();
	await expect(page).toHaveURL(/view=chart/);
	await expect(page.getByRole("table")).toBeHidden();

	// last month's column: 300 + 80, with each category named in the legend
	const column = page.getByRole("img", {
		name: /380\.00 in all\. Groceries .*300\.00, Gym .*80\.00/,
	});
	await expect(column).toBeVisible();
	await expect(page.getByText("Groceries").first()).toBeVisible();
	await column.hover();
	const readout = page.getByRole("status");
	await expect(readout).toContainText("380.00");
	await expect(readout).toContainText("Groceries");
	await expect(readout).toContainText("Gym");

	// back to the table, which has the same figures
	await page.getByRole("button", { name: "Table" }).click();
	await expect(page.getByRole("table", { name: "Spending by category and month" })).toBeVisible();
});
