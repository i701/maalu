import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test("the dashboard shows what is left after bills and money set aside", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "5000");
	await api.account("Pot", "3000", "savings"); // savings are not spendable
	await api.transaction({
		type: "expense",
		amount: "300.00",
		account_id: main.id,
		description: "Wifi",
		transaction_date: today(),
		planned: true,
	});
	const trip = await api.post<{ id: string }>("/goals", { name: "Trip", target_amount: "9000" });
	await api.post(`/goals/${trip.id}/entries`, { amount: "1000" });

	await open(page, "/dashboard");
	await expect(page.getByText(/Available to spend until/)).toBeVisible();
	// 5,000 held, less a 300 bill and 1,000 set aside for the trip
	await expect(page.getByText(/^MVR\s3,700\.00$/).first()).toBeVisible();
	await expect(
		page.getByText(
			/MVR\s5,000\.00 in 1 account, less MVR\s300\.00 for 1 bill and MVR\s1,000\.00 set aside for 1 goal/,
		),
	).toBeVisible();

	// the working behind it
	await page.getByRole("button", { name: "Show the working" }).click();
	await expect(page.getByText("Wifi")).toBeVisible();
	await expect(page.getByText("Set aside for goals", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Hide the working" }).click();
	await expect(page.getByText("Wifi")).toBeHidden();
});

test("it says so when the bills come to more than you have", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "100");
	await api.transaction({
		type: "expense",
		amount: "250.00",
		account_id: id,
		description: "Rent",
		transaction_date: today(),
		planned: true,
	});
	await api.transaction({
		type: "income",
		amount: "9000.00",
		account_id: id,
		category: "Salary",
		description: "Salary",
		transaction_date: today(),
		planned: true,
	});

	await open(page, "/dashboard");
	await expect(page.getByText("Short", { exact: true })).toBeVisible();
	await expect(page.getByText(/^-MVR\s150\.00$/).first()).toBeVisible();
	await page.getByRole("button", { name: "Show the working" }).click();
	// a salary that has not arrived is shown but never counted
	await expect(page.getByText(/MVR\s9,000\.00 of income is planned before then/)).toBeVisible();
});

test("a new account is asked to add an everyday account", async ({ page }) => {
	await signUp(page);
	await open(page, "/dashboard");
	await expect(page.getByText(/Add a cash, current or debit account/)).toBeVisible();
	await page.getByRole("link", { name: "Go to Accounts" }).click();
	await expect(page).toHaveURL(/\/accounts/);
});
