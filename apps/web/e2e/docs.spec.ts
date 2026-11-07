import { expect, test } from "@playwright/test";
import { open, signUp } from "./helpers";

test("the Docs link opens the guides, and a guide links to the pages it describes", async ({
	page,
}) => {
	test.setTimeout(60_000);
	await signUp(page);
	await open(page, "/dashboard");

	await page.getByRole("link", { name: "Docs" }).click();
	await expect(page).toHaveURL(/\/docs$/);
	await expect(page.getByRole("heading", { name: "Docs" })).toBeVisible();
	for (const title of [
		"Subscriptions and recurring bills",
		"Bills that change each month",
		"Split your salary",
	])
		await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

	await page.getByRole("link", { name: /Split your salary/ }).click();
	await expect(page).toHaveURL(/\/docs\/salary-split$/);
	await expect(page.getByRole("heading", { name: "Split your salary" })).toBeVisible();

	// a link in the text goes to the page it names, inside the app
	await page.getByRole("article").getByRole("link", { name: "Settings" }).first().click();
	await expect(page).toHaveURL(/\/settings$/);
	// (the guide has its own example of this card, so wait for the real page by its title)
	await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});

test("a guide has an On this page list that jumps to its sections", async ({ page }) => {
	await signUp(page);
	await open(page, "/docs/salary-split");
	const toc = page.getByRole("navigation", { name: "On this page" });
	await expect(toc.getByRole("button", { name: "Undoing a split" })).toBeVisible();
	await toc.getByRole("button", { name: "Undoing a split" }).click();
	await expect(page.getByRole("heading", { name: "Undoing a split" })).toBeInViewport();
});

test("the guides link to each other", async ({ page }) => {
	await signUp(page);
	await open(page, "/docs/subscriptions");
	await expect(
		page.getByRole("heading", { name: "Subscriptions and recurring bills" }),
	).toBeVisible();
	await page
		.getByRole("article")
		.getByRole("link", { name: "Bills that change each month", exact: true })
		.click();
	await expect(page).toHaveURL(/\/docs\/varying-bills$/);
	await expect(page.getByRole("heading", { name: "Bills that change each month" })).toBeVisible();
	await page.getByRole("link", { name: "Guide: subscriptions and recurring bills" }).click();
	await expect(page).toHaveURL(/\/docs\/subscriptions$/);
});

test("a guide that does not exist says so and leads back", async ({ page }) => {
	await signUp(page);
	await open(page, "/docs/nope");
	await expect(page.getByText("There is no guide with that name.")).toBeVisible();
	await page.getByRole("link", { name: "See all the docs" }).click();
	await expect(page).toHaveURL(/\/docs$/);
});

test("the accounts guide leads to the guide for an account's page, which finds its own words", async ({
	page,
}) => {
	await signUp(page);
	await open(page, "/docs/accounts");
	await page
		.getByRole("article")
		.getByRole("link", { name: "An account's page", exact: true })
		.click();
	await expect(page).toHaveURL(/\/docs\/account-page$/);
	await expect(page.getByRole("heading", { name: "Balance over time" })).toBeVisible();

	// the search on the index finds it by something only it says
	await open(page, "/docs?q=running+balance");
	await expect(page.getByText("An account's page").first()).toBeVisible();
});

test("a guide shows its screenshot, loaded and with a caption", async ({ page }) => {
	test.setTimeout(60_000);
	await signUp(page);
	await open(page, "/docs/reports");
	const shot = page.getByRole("img", { name: /The Compare page/ });
	await shot.scrollIntoViewIfNeeded();
	await expect
		.poll(() => shot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
		.toBeGreaterThan(0);
	await expect(page.getByText(/^Compare: this month so far/)).toBeVisible();
});

test("a guide can show a live example of the app, filled with made-up data and not clickable", async ({
	page,
}) => {
	test.setTimeout(60_000);
	await signUp(page);
	await open(page, "/docs/accounts");
	const example = page.getByRole("group", { name: "Example: a credit card's Statement panel" });
	await example.scrollIntoViewIfNeeded();
	await expect(example.getByText(/^Pay MVR\s7,190\.50 by/)).toBeVisible();
	// inert: its Repay button cannot be focused or pressed
	await expect(example.locator("[inert]")).toHaveCount(1);
	await example.getByRole("button", { name: "Repay" }).focus();
	// the focus did not move into the example: it is still on the page itself
	expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
});

test("the plan, budget and salary guides show live examples", async ({ page }) => {
	test.setTimeout(90_000);
	await signUp(page);
	for (const [guide, example, text] of [
		["month-plan", "the Month plan's bills by day", "BML Visa card payment"],
		["budget", "the Budget page's summary and limits", "Fun and shopping"],
		["salary-split", "the salary rules card in Settings", "MIB Savings"],
	]) {
		await open(page, `/docs/${guide}`);
		const box = page.getByRole("group", { name: `Example: ${example}` });
		await box.scrollIntoViewIfNeeded();
		await expect(box.getByText(text).first()).toBeVisible();
	}
});
