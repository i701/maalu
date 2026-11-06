import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** An ISO date `days` from today (UTC, like the dates the API checks against). */
const inDays = (days: number) => {
	const d = new Date();
	return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + days))
		.toISOString()
		.slice(0, 10);
};

async function withTrip(
	page: import("@playwright/test").Page,
	request: import("@playwright/test").APIRequestContext,
) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	await api.transaction({
		type: "expense",
		amount: "750.00",
		account_id: id,
		category: "Trip",
		transaction_date: inDays(0),
	});
	const trip = (await api.get<{ id: string; name: string }[]>("/categories")).find(
		(c) => c.name === "Trip",
	)!.id;
	return { api, trip };
}

test("a running limit for set dates can be repeated for the next stretch", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const { api, trip } = await withTrip(page, request);
	await api.post("/budget/lines", {
		name: "Thailand",
		category_ids: [trip],
		amount: "1000",
		start_date: inDays(-1),
		end_date: inDays(3),
	});

	await open(page, "/budget");
	await page.getByRole("button", { name: "Repeat for the next stretch" }).click();
	const dialog = page.getByRole("dialog", { name: "Repeat limit" });
	// filled in: the same name, amount and categories, starting the day after, as long as before
	await expect(dialog.getByLabel("Name")).toHaveValue("Thailand");
	await expect(dialog.getByLabel("Limit for these dates (MVR)")).toHaveValue("1000.0000");
	await expect(dialog.getByLabel("From")).toHaveValue(inDays(4));
	await expect(dialog.getByLabel("Until")).toHaveValue(inDays(8));
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	const budget = await api.get<{ fixed_lines: { start_date: string; end_date: string }[] }>(
		"/budget",
	);
	expect(budget.fixed_lines.map((l) => [l.start_date, l.end_date])).toEqual([
		[inDays(-1), inDays(3)],
		[inDays(4), inDays(8)],
	]);
});

test("a monthly limit can run only between two dates", async ({ page, request }) => {
	test.setTimeout(60_000);
	await withTrip(page, request);

	await open(page, "/budget");
	await page.getByRole("button", { name: "Add limit" }).click();
	const dialog = page.getByRole("dialog", { name: "Add limit" });
	await dialog.getByLabel("Name").fill("Holiday food");
	await dialog.getByRole("combobox", { name: "Categories" }).click();
	await page.getByRole("option", { name: "Trip" }).click();
	await dialog.getByRole("switch", { name: "Only for certain dates" }).check();
	await dialog.getByLabel("From").fill(inDays(0));
	await dialog.getByLabel("Until").fill(inDays(40));
	await dialog.getByRole("combobox", { name: "How it counts" }).click();
	await page.getByRole("option", { name: /for every period between/ }).click();
	await dialog.getByLabel("Limit per period (MVR)").fill("1000");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	// it is one of the per-period limits (this period counts, so the summary is there), with the
	// whole periods it runs in
	await expect(page.getByText("Spent this period")).toBeVisible();
	await expect(page.getByText("Holiday food", { exact: true })).toBeVisible();
	await expect(page.getByText(/^Runs /)).toBeVisible();
	await expect(page.getByText("For set dates")).toBeHidden();
});

test("a running limit for set dates is on the dashboard", async ({ page, request }) => {
	test.setTimeout(60_000);
	const { api, trip } = await withTrip(page, request);
	await api.post("/budget/lines", {
		name: "Thailand",
		category_ids: [trip],
		amount: "1000",
		start_date: inDays(-1),
		end_date: inDays(10),
	});

	await open(page, "/dashboard");
	await expect(page.getByText(/^Thailand until /)).toBeVisible();
	await expect(page.getByText(/MVR\s750\.00 of MVR\s1,000\.00/)).toBeVisible();
	await expect(
		page.getByRole("progressbar", { name: "Thailand spent against its limit" }),
	).toBeVisible();
	await expect(page.getByText(/No budget limits yet/)).toBeHidden();
});
