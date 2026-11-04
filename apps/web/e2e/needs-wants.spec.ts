import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** The first day of this month, which is never in the future. */
function thisMonth(): string {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

test("sorting categories into needs and wants shows how spending divides", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	for (const [category, amount] of [
		["Groceries", "300.00"],
		["Games", "100.00"],
		["Misc", "100.00"],
	]) {
		await api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category,
			transaction_date: thisMonth(),
		});
	}

	// nothing is sorted yet, so all of it is "not sorted" and the card says how to fix that
	await open(page, "/dashboard");
	await expect(
		page.getByRole("img", { name: "Needs 0%, Wants 0%, Not sorted 100%" }),
	).toBeVisible();
	await expect(page.getByText(/100% of this spending isn't sorted yet/)).toBeVisible();

	// sort two of the three categories in one go
	await open(page, "/categories");
	await page.getByRole("button", { name: /Needs and wants \(3 not sorted\)/ }).click();
	const dialog = page.getByRole("dialog", { name: "Needs and wants" });
	await dialog
		.getByRole("group", { name: "Groceries: need or want" })
		.getByRole("button", { name: "Need" })
		.click();
	await dialog
		.getByRole("group", { name: "Games: need or want" })
		.getByRole("button", { name: "Want" })
		.click();
	await dialog.getByRole("button", { name: "Save 2" }).click();
	await expect(page.getByText("2 categories sorted")).toBeVisible();

	// the Categories page shows each one's kind, and the one left over still needs sorting
	await expect(dialog).toBeHidden();
	const rows = page.getByRole("main");
	await expect(rows.getByText("Need", { exact: true })).toBeVisible();
	await expect(rows.getByText("Want", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("button", { name: /Needs and wants \(1 not sorted\)/ }),
	).toBeVisible();

	// 300 needed, 100 wanted, 100 not sorted
	await open(page, "/dashboard");
	await expect(
		page.getByRole("img", { name: "Needs 60%, Wants 20%, Not sorted 20%" }),
	).toBeVisible();
	await expect(page.getByText(/20% of this spending isn't sorted yet/)).toBeVisible();
});

test("a category can be marked a want from its own form", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "100");
	await api.transaction({
		type: "expense",
		amount: "10.00",
		account_id: id,
		category: "Cinema",
		transaction_date: thisMonth(),
	});

	await open(page, "/categories");
	// the first card: Cinema comes before the default Salary category
	await page.getByRole("button", { name: "Edit" }).first().click();
	await page.getByLabel("Need or want").click();
	await page.getByRole("option", { name: "Want" }).click();
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByText("Category saved")).toBeVisible();
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(page.getByRole("main").getByText("Want", { exact: true })).toBeVisible();
});
