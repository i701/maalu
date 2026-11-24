import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** The first day of this month, which is never in the future. */
function thisMonth(): string {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

test("the Categories page shows what each category spent this month, a parent with its sub-categories", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	const food = await api.post<{ id: string }>("/categories", { name: "Food" });
	await api.post("/categories", { name: "Dining", parent_id: food.id });
	// a limit on Food, which covers Dining too: 900 of 1,800 is half used
	await api.post("/budget/lines", { name: "Food limit", category_ids: [food.id], amount: "1800" });
	// and one on Rent that is nearly used up (3,000 of 3,500), past the default warning level
	const rent = await api.post<{ id: string }>("/categories", { name: "Rent" });
	await api.post("/budget/lines", { name: "Rent limit", category_ids: [rent.id], amount: "3500" });
	for (const [category, amount] of [
		["Food", "100.00"],
		["Dining", "800.00"],
		["Rent", "3000.00"],
	]) {
		await api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category,
			transaction_date: thisMonth(),
		});
	}

	await open(page, "/categories");
	// the cards view shows it as a chip; the table has the Spent column
	await expect(page.getByText("MVR 900.00 spent")).toBeVisible();
	await page.getByRole("button", { name: "Table" }).click();
	const row = (name: string) => page.getByRole("row").filter({ hasText: name });
	// a sub-category shows its own spending, a parent its own plus the sub-categories'
	await expect(row("Dining")).toContainText("800.00");
	await expect(row("Food").first()).toContainText("900.00");
	await expect(row("Food").first()).toContainText("with sub-categories");
	await expect(row("Rent")).toContainText("3,000.00");
	await expect(page.getByText("MVR 3,900.00 spent in")).toBeVisible();

	// the ring shows how much of the limit is used, on Food and on Dining (the limit covers it)
	const ring = (name: string) => row(name).getByRole("img", { name: /Food limit/ });
	await expect(ring("Food").first()).toHaveAccessibleName(/\(50%\)/);
	await expect(ring("Dining")).toBeVisible();
	// Rent is at 86% of its limit: red, and the tooltip's words say it is close
	const rentRing = row("Rent").getByRole("img", { name: /Rent limit/ });
	await expect(rentRing).toHaveAccessibleName(/close to limit/);
	const foodColor = await ring("Dining").evaluate((el) => getComputedStyle(el).color);
	await expect(rentRing).not.toHaveCSS("color", foodColor);

	// the figure leads to that month's transactions in the category
	await row("Rent").getByRole("link", { name: /3,000/ }).click();
	await expect(page).toHaveURL(/\/transactions\?.*category_id=/);
	await expect(page).toHaveURL(/date_from=/);

	// another month has nothing spent
	await open(page, "/categories");
	await page.getByRole("button", { name: "Previous month" }).click();
	await expect(row("Rent")).not.toContainText("3,000.00");
	await expect(row("Rent").getByLabel("Nothing spent")).toBeVisible();
});
