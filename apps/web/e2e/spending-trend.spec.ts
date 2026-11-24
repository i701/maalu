import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** The first day of the month `back` months before this one, never in the future. */
function monthStart(back: number): string {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth() - back, 1)).toISOString().slice(0, 10);
}

test("the dashboard stacks spending by month, and a category can be followed through it", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "50000");
	// six categories over two months: the four biggest are drawn, the other two folded into Other
	for (const [category, amount, back] of [
		["Rent", "3000.00", 0],
		["Rent", "3000.00", 1],
		["Groceries", "800.00", 0],
		["Dining", "500.00", 1],
		["Games", "300.00", 0],
		["Transport", "200.00", 1],
		["Gifts", "100.00", 0],
	] as const) {
		await api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category,
			transaction_date: monthStart(back),
		});
	}

	await open(page, "/dashboard");
	const card = page.getByRole("group", {
		name: "Spending by month for the last 6 months, stacked by category",
	});
	await expect(card).toBeVisible();
	await expect(page.getByText("Spending by month", { exact: true })).toBeVisible();
	await expect(page.getByText("Last 6 months", { exact: true })).toBeVisible();

	// a chip for each category drawn and one for the rest, each with what it came to
	const chip = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) });
	for (const name of ["Rent", "Groceries", "Dining", "Games", "Other"]) {
		await expect(chip(name)).toBeVisible();
	}
	await expect(chip("Gifts")).toHaveCount(0);
	await expect(chip("Rent")).toContainText("6,000.00");
	await expect(chip("Other")).toContainText("300.00");

	// following a category: its name joins the subtitle, and pressing it again lets go
	await chip("Rent").click();
	await expect(chip("Rent")).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByText("Rent · Last 6 months", { exact: true })).toBeVisible();
	await chip("Rent").click();
	await expect(chip("Rent")).toHaveAttribute("aria-pressed", "false");

	// 12 months, and a followed category is let go of
	await chip("Rent").click();
	await page
		.getByRole("group", { name: "Months shown" })
		.getByRole("button", { name: "12 mo" })
		.click();
	await expect(page.getByText("Last 12 months", { exact: true })).toBeVisible();
	await expect(chip("Rent")).toHaveAttribute("aria-pressed", "false");
});
