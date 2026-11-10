import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test("the month plan shows where the money runs out, and receiving the salary fixes it", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "1000");
	const planned = (description: string, amount: string, type = "expense", category = "Bills") =>
		api.transaction({
			type,
			amount,
			account_id: id,
			category,
			description,
			transaction_date: today(),
			planned: true,
		});
	await planned("Rent", "800");
	await planned("Wifi", "400");
	await planned("Pay day", "9000", "income", "Salary");

	await open(page, "/plan");
	// 1,000 held, less 800 and 400 of bills: 200 left after rent, then 200 short
	await expect(page.getByText("Short by")).toBeVisible();
	await expect(page.getByText(/The money runs out at Wifi/)).toBeVisible();
	await expect(page.getByText("Short from here")).toBeVisible();
	await expect(page.getByText(/^MVR\s200\.00 left$/)).toBeVisible();
	await expect(page.getByText(/^-MVR\s200\.00 left$/)).toBeVisible();
	// the salary is listed but never counted until it arrives
	await expect(page.getByText("Expected · not counted")).toBeVisible();

	// the real salary is not the planned one: enter what actually arrived
	await page.getByRole("button", { name: "Received" }).click();
	const received = page.getByRole("dialog", { name: "Mark as received" });
	await expect(received.getByLabel("Amount received")).toHaveValue("9000");
	await received.getByLabel("Amount received").fill("8750");
	await received.getByRole("button", { name: "Save", exact: true }).click();
	await expect(received).toBeHidden();

	// 9,750 held now (1,000 and 8,750), so everything is covered
	await expect(
		page.getByText("Every bill planned until the end of the period is covered."),
	).toBeVisible();
	await expect(page.getByText("Available to spend", { exact: true })).toBeVisible();
	await expect(page.getByText("Short from here")).toBeHidden();
	const balance = Number((await api.get<{ balance: string }>(`/accounts/${id}`)).balance);
	expect(balance).toBe(9750);
});

test("paying a bill from the plan moves it out of the bills still to pay", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "5000");
	await api.transaction({
		type: "expense",
		amount: "300.00",
		account_id: id,
		category: "Bills",
		description: "Electricity",
		transaction_date: today(),
		planned: true,
	});

	await open(page, "/plan");
	await expect(page.getByText("Electricity")).toBeVisible();
	await expect(page.getByText("Today", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Mark as paid" }).click();
	const dialog = page.getByRole("dialog", { name: "Mark as paid" });
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();

	await expect(page.getByText("Electricity")).toBeHidden();
	await expect(page.getByText(/Nothing planned before/)).toBeVisible();
	// it is spending now, so 4,700 is left to spend
	await expect(page.getByText(/MVR\s4,700\.00/).first()).toBeVisible();
});

test("a new account is asked to add an everyday account first", async ({ page }) => {
	await signUp(page);
	await open(page, "/plan");
	await expect(page.getByText(/Add a cash, current or debit account/)).toBeVisible();
	await page.getByRole("link", { name: "Go to Accounts" }).click();
	await expect(page).toHaveURL(/\/accounts/);
});
