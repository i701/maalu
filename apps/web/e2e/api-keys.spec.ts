import { expect, test } from "@playwright/test";
import { open, signUp } from "./helpers";

const API = "http://localhost:8101/api/v1";

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

test("a key is made with chosen permissions, rotated, and deleted", async ({ page, request }) => {
	test.setTimeout(90_000);
	await signUp(page);
	await open(page, "/settings");

	// make a key with the Reports only role
	await page.getByRole("button", { name: "New key" }).click();
	const form = page.getByRole("dialog", { name: "New API key" });
	await form.getByLabel("Name").fill("Telegram bot");
	await form.getByRole("combobox", { name: "Role" }).click();
	await page.getByRole("option", { name: "Reports only" }).click();
	await form.getByRole("button", { name: "Make key" }).click();

	// the secret is shown once
	const shown = page.getByRole("dialog", { name: "Your key" });
	await expect(shown).toBeVisible();
	const secret = (await shown.getByText(/^mlk_/).textContent())?.trim() ?? "";
	expect(secret).toMatch(/^mlk_/);
	await shown.getByRole("button", { name: "Done" }).click();
	await expect(shown).toBeHidden();
	await expect(page.getByText("Telegram bot")).toBeVisible();
	await expect(page.getByText(/Reports only/).first()).toBeVisible();

	// it may read the plan and the budget, and nothing else
	expect((await request.get(`${API}/budget`, auth(secret))).status()).toBe(200);
	expect((await request.get(`${API}/accounts`, auth(secret))).status()).toBe(403);
	expect((await request.get(`${API}/backup`, auth(secret))).status()).toBe(403);

	// rotate it, with the old secret stopping at once
	await page.getByRole("button", { name: "Rotate" }).click();
	const rotate = page.getByRole("dialog", { name: /Rotate/ });
	await rotate.getByRole("combobox", { name: "Keep the old secret working" }).click();
	await page.getByRole("option", { name: /Not at all/ }).click();
	await rotate.getByRole("button", { name: "Rotate key" }).click();
	const fresh = page.getByRole("dialog", { name: "Your new key" });
	const next = (await fresh.getByText(/^mlk_/).textContent())?.trim() ?? "";
	expect(next).not.toBe(secret);
	await fresh.getByRole("button", { name: "Done" }).click();
	expect((await request.get(`${API}/budget`, auth(secret))).status()).toBe(401);
	expect((await request.get(`${API}/budget`, auth(next))).status()).toBe(200);

	// delete it: it stops working at once
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
	await expect(page.getByText("Telegram bot")).toBeHidden();
	expect((await request.get(`${API}/budget`, auth(next))).status()).toBe(401);
});

test("the permission grid can be changed and the role follows it", async ({ page }) => {
	test.setTimeout(60_000);
	await signUp(page);
	await open(page, "/settings");
	await page.getByRole("button", { name: "New key" }).click();
	const form = page.getByRole("dialog", { name: "New API key" });
	await form.getByLabel("Name").fill("Custom key");
	// start as Viewer, then add a permission: it is no longer exactly that role
	await form.getByRole("checkbox", { name: "Transactions: Add and change" }).check();
	await expect(form.getByRole("combobox", { name: "Role" })).toHaveText(/Assistant/);
	await form.getByRole("checkbox", { name: "Goals: Delete" }).check();
	await expect(form.getByRole("combobox", { name: "Role" })).toHaveText(/Custom/);
	await form.getByRole("button", { name: "Make key" }).click();
	await page
		.getByRole("dialog", { name: "Your key" })
		.getByRole("button", { name: "Done" })
		.click();
	await expect(page.getByText(/Custom \(\d+ permissions\)/)).toBeVisible();
});
