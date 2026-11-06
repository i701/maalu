import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("money moves from one limit to another for the period, and the move can be undone", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	// the categories have to exist before limits can be put on them
	await api.transaction({ type: "expense", amount: "950", account_id: id, category: "Groceries" });
	await api.transaction({ type: "expense", amount: "100", account_id: id, category: "Fun" });
	const categories = await api.get<{ id: string; name: string }[]>("/categories");
	const category = (name: string) => categories.find((c) => c.name === name)?.id;
	await api.post("/budget/lines", {
		name: "Groceries",
		category_ids: [category("Groceries")],
		amount: "1000",
	});
	await api.post("/budget/lines", { name: "Fun", category_ids: [category("Fun")], amount: "500" });

	await open(page, "/budget");
	await expect(page.getByText(/MVR.50\.00 left/)).toBeVisible(); // Groceries is nearly spent
	await page.getByRole("button", { name: "Move money here" }).first().click();
	const dialog = page.getByRole("dialog", { name: "Move money to Groceries" });
	await expect(dialog.getByRole("combobox", { name: "From" })).toHaveText(/Fun · MVR.400\.00 left/);

	// a limit can't give more than it has left
	await dialog.getByLabel("Amount (MVR)").fill("401");
	await dialog.getByRole("button", { name: "Move", exact: true }).click();
	await expect(dialog.getByText("That is more than it has left")).toBeVisible();

	await dialog.getByLabel("Amount (MVR)").fill("200");
	await dialog.getByLabel("Note (optional)").fill("Guests");
	await dialog.getByRole("button", { name: "Move", exact: true }).click();
	await expect(dialog).toBeHidden();

	// Groceries gets 200 more and Fun 200 less, for this period only; the total stays 1,500
	await expect(page.getByText(/\+MVR.200\.00 from Fun this period · Guests/)).toBeVisible();
	await expect(page.getByText(/−MVR.200\.00 to Groceries this period/)).toBeVisible();
	await expect(page.getByText(/MVR.250\.00 left/)).toBeVisible();
	await expect(page.getByText(/of MVR.1,500\.00/)).toBeVisible();

	await page.getByRole("button", { name: "Undo" }).first().click();
	await expect(page.getByText(/from Fun this period/)).toBeHidden();
	await expect(page.getByText(/MVR.50\.00 left/)).toBeVisible();

	// the history still has the move, with its note, marked undone
	await page.getByRole("button", { name: "History" }).first().click();
	const history = page.getByRole("dialog", { name: "Money moved, Groceries" });
	await expect(history.getByText(/\+MVR.200\.00 from Fun/)).toBeVisible();
	await expect(history.getByText("Guests")).toBeVisible();
	await expect(history.getByText("Undone", { exact: true })).toBeVisible();
	await expect(history.getByText(/· undone /)).toBeVisible();
});

test("a limit with no moves says so in its history", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "100");
	await api.transaction({ type: "expense", amount: "5", account_id: id, category: "Groceries" });
	const categories = await api.get<{ id: string; name: string }[]>("/categories");
	await api.post("/budget/lines", {
		name: "Groceries",
		category_ids: [categories.find((c) => c.name === "Groceries")?.id],
		amount: "100",
	});
	await open(page, "/budget");
	await page.getByRole("button", { name: "History" }).click();
	await expect(
		page.getByText("No money has been moved into or out of this limit yet."),
	).toBeVisible();
});
