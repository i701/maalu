import { expect, test, type Browser, type Page } from "@playwright/test";
import { open, signIn, signOut, signUp, totp } from "./helpers";

/** Turn two-factor on from Settings. Returns the key (for making codes) and the recovery codes. */
async function turnOn(page: Page) {
	await open(page, "/settings");
	await page.getByRole("button", { name: "Set up" }).click();
	const setup = page.getByRole("dialog", { name: "Set up two-factor" });
	const secret = (await setup.locator("code").textContent())?.trim() ?? "";
	expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
	await setup.getByLabel("Authentication code").fill(totp(secret));
	await setup.getByRole("button", { name: "Turn on" }).click();

	const saved = page.getByRole("dialog", { name: "Save your recovery codes" });
	await expect(saved).toBeVisible();
	const codes = (await saved.locator("li").allTextContents()).map((c) => c.trim());
	expect(codes.length).toBeGreaterThanOrEqual(8);
	await saved.getByRole("button", { name: "I have saved them" }).click();
	await expect(page.getByText("On", { exact: true })).toBeVisible();
	return { secret, codes };
}

/** A second browser, as another device. */
async function otherDevice(browser: Browser, baseURL: string | undefined) {
	const context = await browser.newContext({ baseURL });
	return { page: await context.newPage(), close: () => context.close() };
}

test("with two-factor on, signing in needs a code from the app", async ({ page }) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const { secret } = await turnOn(page);
	await signOut(page);

	await signIn(page, email);
	// the password was right, so the second step asks for the code and the dashboard waits
	await expect(page.getByLabel("Authentication code")).toBeVisible();
	await expect(page).toHaveURL(/\/login/);

	await page.getByLabel("Authentication code").fill(totp(secret, 1)); // a later step than setup used
	await page.getByRole("button", { name: "Verify" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
});

test("a wrong code is refused, and a recovery code works once", async ({ page }) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const { codes } = await turnOn(page);
	await signOut(page);

	await signIn(page, email);
	await page.getByLabel("Authentication code").fill("000000");
	await page.getByRole("button", { name: "Verify" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/login/);

	await page.getByRole("button", { name: "Use a recovery code instead" }).click();
	await page.getByLabel("Recovery code").fill(codes[0]);
	await page.getByRole("button", { name: "Verify" }).click();
	await expect(page).toHaveURL(/\/dashboard/);

	// the same recovery code does not work a second time
	await signOut(page);
	await signIn(page, email);
	await page.getByRole("button", { name: "Use a recovery code instead" }).click();
	await page.getByLabel("Recovery code").fill(codes[0]);
	await page.getByRole("button", { name: "Verify" }).click();
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/login/);

	// another one does
	await page.getByLabel("Recovery code").fill(codes[1]);
	await page.getByRole("button", { name: "Verify" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
});

test("turning it on signs out the other devices", async ({ page, browser, baseURL }) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const phone = await otherDevice(browser, baseURL);
	await signIn(phone.page, email);
	await expect(phone.page).toHaveURL(/\/dashboard/);

	await turnOn(page); // this device stays signed in, the other one is made without a second factor

	await open(phone.page, "/transactions");
	await expect(phone.page).toHaveURL(/\/login/);
	await open(page, "/transactions");
	await expect(page).toHaveURL(/\/transactions/);
	await phone.close();
});

test("two-factor can be turned off with the password and a code", async ({ page }) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const { codes } = await turnOn(page);

	await page.getByRole("button", { name: "Turn off" }).click();
	const confirm = page.getByRole("dialog", { name: "Turn off two-factor" });
	await confirm.getByLabel("Password").fill("e2e-password-1234");
	await confirm.getByRole("button", { name: "Use a recovery code instead" }).click();
	await confirm.getByLabel("Recovery code").fill(codes[0]);
	await confirm.getByRole("button", { name: "Turn off" }).click();
	await expect(page.getByText("Two-factor is off")).toBeVisible();

	// signing in is back to the password alone
	await signOut(page);
	await signIn(page, email);
	await expect(page).toHaveURL(/\/dashboard/);
});

test("turning it off needs the right password", async ({ page }) => {
	test.setTimeout(90_000);
	await signUp(page);
	const { codes } = await turnOn(page);

	await page.getByRole("button", { name: "Turn off" }).click();
	const confirm = page.getByRole("dialog", { name: "Turn off two-factor" });
	await confirm.getByLabel("Password").fill("not-my-password");
	await confirm.getByRole("button", { name: "Use a recovery code instead" }).click();
	await confirm.getByLabel("Recovery code").fill(codes[0]);
	await confirm.getByRole("button", { name: "Turn off" }).click();
	await expect(confirm.getByRole("alert")).toBeVisible();
	await expect(page.getByText("Two-factor is off")).toBeHidden();
});
