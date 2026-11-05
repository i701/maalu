import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** An ISO date `days` from today (UTC, like the dates the API checks against). */
const inDays = (days: number) => {
	const d = new Date();
	return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + days))
		.toISOString()
		.slice(0, 10);
};

type Setup = { api: Awaited<ReturnType<typeof apiAs>>; account: string };

/** A user with a wallet and some spending in a "Trip" category (which has to exist first). */
async function withTrip(
	page: import("@playwright/test").Page,
	request: import("@playwright/test").APIRequestContext,
	spent = "750.00",
): Promise<Setup> {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	await api.transaction({
		type: "expense",
		amount: spent,
		account_id: id,
		category: "Trip",
		transaction_date: inDays(0),
	});
	return { api, account: id };
}

const category = async (api: Setup["api"], name: string) =>
	(await api.get<{ id: string; name: string }[]>("/categories")).find((c) => c.name === name)!.id;

test("a limit for set dates is added from the Budget page and counts the whole stretch", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	await withTrip(page, request);

	await open(page, "/budget");
	await page.getByRole("button", { name: "Add limit" }).click();
	const dialog = page.getByRole("dialog", { name: "Add limit" });
	await dialog.getByLabel("Name").fill("Thailand");
	await dialog.getByRole("combobox", { name: "Categories" }).click();
	await page.getByRole("option", { name: "Trip" }).click();
	await dialog.getByRole("switch", { name: "Only for certain dates" }).check();
	await dialog.getByLabel("From").fill(inDays(-1));
	await dialog.getByLabel("Until").fill(inDays(10));
	await dialog.getByLabel("Limit for these dates (MVR)").fill("1000");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	// it has its own section, with what was spent over the whole stretch and the days left
	await expect(page.getByText("For set dates")).toBeVisible();
	await expect(page.getByText("Thailand", { exact: true })).toBeVisible();
	await expect(page.getByText(/MVR\s750\.00/)).toBeVisible();
	await expect(page.getByText(/of MVR\s1,000\.00/)).toBeVisible();
	await expect(page.getByText(/11 days left/)).toBeVisible();
	await expect(page.getByText(/On track · 75%/)).toBeVisible();
	// and it is not one of the per-period limits, so there is no summary of them
	await expect(page.getByText("Spent this period")).toBeHidden();
});

test("saving an expense inside the dates warns", async ({ page, request }) => {
	test.setTimeout(60_000);
	const { api } = await withTrip(page, request, "850.00");
	const trip = await category(api, "Trip");
	await api.post("/budget/lines", {
		name: "Thailand",
		category_ids: [trip],
		amount: "1000",
		start_date: inDays(-1),
		end_date: inDays(10),
	});

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByLabel("Amount").fill("100");
	await form.getByRole("combobox", { name: /^Category/ }).fill("Trip");
	await page.getByRole("option", { name: "Trip" }).click();
	await form.getByRole("button", { name: "Save", exact: true }).click();
	// 850 + 100 of 1,000 is past the warning level
	await expect(page.getByText("Thailand is at 95% of its limit").first()).toBeVisible();
});

test("a limit that has not started yet does not warn", async ({ page, request }) => {
	test.setTimeout(60_000);
	const { api } = await withTrip(page, request, "990.00");
	const trip = await category(api, "Trip");
	// 99% spent, but the dates are still ahead
	await api.post("/budget/lines", {
		name: "Later",
		category_ids: [trip],
		amount: "1000",
		start_date: inDays(5),
		end_date: inDays(15),
	});

	await open(page, "/budget");
	await expect(page.getByText("Later", { exact: true })).toBeVisible();
	await expect(page.getByText(/to its end/)).toBeVisible();
	await open(page, "/transactions");
	await expect(page.getByText("Trip").first()).toBeVisible();
	await expect(page.getByText(/of its limit/)).toBeHidden();
});

test("the dates can be taken off, which makes it a limit for every period", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const { api } = await withTrip(page, request);
	const trip = await category(api, "Trip");
	await api.post("/budget/lines", {
		name: "Thailand",
		category_ids: [trip],
		amount: "1000",
		start_date: inDays(-1),
		end_date: inDays(10),
	});

	await open(page, "/budget");
	await expect(page.getByText("For set dates")).toBeVisible();
	await page.getByRole("button", { name: "Edit" }).click();
	const dialog = page.getByRole("dialog", { name: "Edit limit" });
	// the dates are filled in, and turning them off shows the per-period wording again
	await expect(dialog.getByLabel("From")).toHaveValue(inDays(-1));
	await dialog.getByRole("switch", { name: "Only for certain dates" }).uncheck();
	await dialog.getByLabel("Limit per period (MVR)").waitFor();
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	await expect(page.getByText("For set dates")).toBeHidden();
	await expect(page.getByText("Spent this period")).toBeVisible();
});

test("a category already in a limit for overlapping dates cannot be picked again", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const { api } = await withTrip(page, request);
	const trip = await category(api, "Trip");
	await api.post("/budget/lines", {
		name: "First",
		category_ids: [trip],
		amount: "1000",
		start_date: inDays(0),
		end_date: inDays(10),
	});

	await open(page, "/budget");
	await page.getByRole("button", { name: "Add limit" }).click();
	const dialog = page.getByRole("dialog", { name: "Add limit" });
	await dialog.getByRole("switch", { name: "Only for certain dates" }).check();
	await dialog.getByLabel("From").fill(inDays(5));
	await dialog.getByLabel("Until").fill(inDays(20));
	await dialog.getByRole("combobox", { name: "Categories" }).click();
	await expect(page.getByRole("option", { name: /Trip/ })).toHaveAttribute("aria-disabled", "true");

	// once the dates no longer touch, it can be used
	await dialog.getByLabel("From").fill(inDays(11));
	await dialog.getByLabel("Until").fill(inDays(20));
	await dialog.getByRole("combobox", { name: "Categories" }).click();
	await expect(page.getByRole("option", { name: /Trip/ })).not.toHaveAttribute(
		"aria-disabled",
		"true",
	);
});
