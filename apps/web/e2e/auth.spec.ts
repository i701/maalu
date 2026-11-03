import { expect, test } from "@playwright/test";
import { newEmail, open, PASSWORD, signUp } from "./helpers";

test("a new person can sign up, sign out and sign back in", async ({ page }) => {
	const email = await signUp(page);
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

	await page
		.getByRole("button", { name: /account|profile|menu/i })
		.first()
		.click();
	await page.getByRole("menuitem", { name: /sign out|log out/i }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.waitForLoadState("networkidle");

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
});

test("a wrong password is refused", async ({ page }) => {
	const email = await signUp(page);
	await page.context().clearCookies();
	await open(page, "/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill("not-the-password");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/login/);
});

test("pages that need a session send you to sign in", async ({ page }) => {
	await page.goto("/transactions");
	await expect(page).toHaveURL(/\/login/);
	expect(newEmail()).toContain("@example.com");
});
