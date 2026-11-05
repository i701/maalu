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
	await expect(page.getByText("When my salary arrives")).toBeVisible();
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
