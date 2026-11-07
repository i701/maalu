import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d;
};
const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("a credit card shows its statement, what is still to pay, and the plan counts it", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const bank = await api.account("Main", "5000");
	const visa = await api.post<{ id: string }>("/accounts", {
		name: "Visa",
		group: "card",
		currency: "MVR",
		credit_limit: "2000",
		// closed 5 days ago, due today: so it is in the plan and not yet late
		statement_day: day(-5).getDate(),
		due_day: day(0).getDate(),
	});
	await api.transaction({
		type: "expense",
		amount: "600",
		account_id: visa.id,
		payment_method: "credit_card",
		category: "Shopping",
		transaction_date: iso(day(-8)),
	});
	await api.transaction({
		type: "expense",
		amount: "100",
		account_id: visa.id,
		payment_method: "credit_card",
		category: "Shopping",
		transaction_date: iso(day(-2)),
	});

	// the Accounts list says what to pay
	await open(page, "/accounts");
	await expect(page.getByText(/Pay MVR\s600\.00 by/)).toBeVisible();

	// the card's page has the statement
	await open(page, `/accounts/${visa.id}`);
	await expect(page.getByRole("heading", { name: "Statement" })).toBeVisible();
	await expect(page.getByText("To pay").or(page.getByText("Due soon")).first()).toBeVisible();
	await expect(page.getByText(/^MVR\s600\.00$/).first()).toBeVisible();

	// the month plan counts it as money not available: 5,000 less the 600 statement
	await open(page, "/plan");
	await expect(page.getByText("Visa card payment")).toBeVisible();
	await expect(page.getByText(/^MVR\s4,400\.00$/).first()).toBeVisible();

	// paying it through the API clears it from the plan and marks the statement paid
	await api.post("/transactions", {
		type: "transfer",
		amount: "600",
		to_amount: "600",
		account_id: bank.id,
		to_account_id: visa.id,
		transaction_date: iso(day(0)),
	});
	await open(page, "/plan");
	await expect(page.getByText("Visa card payment")).toHaveCount(0);
	await open(page, `/accounts/${visa.id}`);
	await expect(page.getByText("Paid", { exact: true })).toBeVisible();
});

test("the statement days are set from the account form, both or neither", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const visa = await api.account("Visa", "0", "card");

	await open(page, `/accounts/${visa.id}`);
	await expect(page.getByRole("heading", { name: "Statement" })).toHaveCount(0);

	await page.getByRole("button", { name: "Edit account" }).click();
	const dialog = page.getByRole("dialog", { name: /Edit/ });
	await dialog.getByLabel("Statement closes on day").fill("5");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog.getByText(/both the day the statement closes/)).toBeVisible();

	await dialog.getByLabel("Payment due on day").fill("25");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole("heading", { name: "Statement" })).toBeVisible();
	await expect(page.getByText("Closes on the 5th, due on the 25th")).toBeVisible();
});
