import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("the transaction list can be narrowed to needs, wants or what is not sorted", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	await api.post("/categories", { name: "Groceries", kind: "need" });
	await api.post("/categories", { name: "Games", kind: "want" });
	await api.post("/categories", { name: "Misc" });
	const date = new Date().toISOString().slice(0, 10);
	for (const [category, description] of [
		["Groceries", "Weekly shop"],
		["Games", "New game"],
		["Misc", "Odd thing"],
	]) {
		await api.transaction({
			type: "expense",
			amount: "10.00",
			account_id: id,
			category,
			description,
			transaction_date: date,
		});
	}

	await open(page, "/transactions?sorted_as=need");
	await expect(page.getByText("Weekly shop")).toBeVisible();
	await expect(page.getByText("New game")).toHaveCount(0);
	await expect(page.getByText("Odd thing")).toHaveCount(0);

	await open(page, "/transactions?sorted_as=want");
	await expect(page.getByText("New game")).toBeVisible();
	await expect(page.getByText("Weekly shop")).toHaveCount(0);

	await open(page, "/transactions?sorted_as=unsorted");
	await expect(page.getByText("Odd thing")).toBeVisible();
	await expect(page.getByText("Weekly shop")).toHaveCount(0);
	await expect(page.getByText("New game")).toHaveCount(0);

	// the panel offers it too
	await open(page, "/transactions");
	await page.getByRole("button", { name: "Filters" }).click();
	await page.getByRole("button", { name: "Wants", exact: true }).click();
	await expect(page).toHaveURL(/sorted_as=want/);
	await expect(page.getByText("New game")).toBeVisible();
	await expect(page.getByText("Weekly shop")).toHaveCount(0);
});
