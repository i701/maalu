import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("a savings account can be marked as one you spend from, and the plan counts it", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Main", "5000");
	const pot = await api.account("Pot", "3000", "savings"); // savings are kept apart by default

	await open(page, "/plan");
	await expect(page.getByText(/^MVR\s5,000\.00$/).first()).toBeVisible();

	await open(page, `/accounts/${pot.id}`);
	await page.getByRole("button", { name: "Edit account" }).click();
	const dialog = page.getByRole("dialog", { name: /Edit/ });
	await dialog.getByRole("switch", { name: "I spend from this account" }).check();
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	await open(page, "/plan");
	await expect(page.getByText(/^MVR\s8,000\.00$/).first()).toBeVisible();
});

test("a credit card has no spend-from switch", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const card = await api.account("Visa", "0", "card");

	await open(page, `/accounts/${card.id}`);
	await page.getByRole("button", { name: "Edit account" }).click();
	const dialog = page.getByRole("dialog", { name: /Edit/ });
	await expect(dialog.getByLabel("Name")).toBeVisible();
	await expect(dialog.getByRole("switch", { name: "I spend from this account" })).toHaveCount(0);
});
