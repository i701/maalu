import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type Tx = {
	description: string | null;
	category: string;
	currency: string;
	amount: string;
	exchange_rate: string;
	base_amount: string;
};

test("a varying dollar bill is an estimate, and is paid with the real amount and cost", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("MIB", "5000");
	const usd = await api.post<{ id: string }>("/accounts", {
		name: "USD Card",
		group: "accounts",
		currency: "USD",
		exchange_rate: "15.4",
		opening_amount: "200",
	});
	await api.subscription({
		name: "Digital Ocean",
		amount: "10",
		currency: "USD",
		exchange_rate: "15.4",
		account_id: usd.id,
		amount_varies: true,
		category: "Servers",
	});
	await api.get("/subscriptions"); // plans the next payment

	await open(page, "/plan");
	await expect(page.getByText("Estimate", { exact: true })).toBeVisible();
	await expect(page.getByText(/≈ −MVR\s154\.00/)).toBeVisible();
	await page.getByRole("button", { name: "Enter the real amount" }).click();

	const dialog = page.getByRole("dialog", { name: "Mark as paid" });
	await expect(dialog.getByLabel("Exchange rate")).toHaveValue("15.4");
	await dialog.getByLabel("Amount").fill("12");
	// the rate field shows what the new amount comes to at the planned rate
	await expect(dialog.getByText(/Comes to MVR\s184\.80/)).toBeVisible();
	// what the bank really took wins, and the rate field steps aside
	await dialog.getByLabel("Charged in MVR").fill("186");
	await expect(dialog.getByLabel("Exchange rate")).toBeDisabled();
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("Estimate", { exact: true })).toBeHidden();

	// USD 12 charged MVR 186 is a rate of 15.5, exactly
	const paid = (await api.get<Tx[]>("/transactions")).find(
		(t) => t.category === "Servers" || t.description === "Digital Ocean",
	);
	expect(paid).toBeDefined();
	expect(paid?.currency).toBe("USD");
	expect(Number(paid?.amount)).toBe(12);
	expect(Number(paid?.exchange_rate)).toBe(15.5);
	expect(Number(paid?.base_amount)).toBe(186);

	// the next payment is planned at the usual amount again
	const next = await api.get<Tx[]>("/transactions?planned=true");
	expect(next.map((t) => Number(t.amount))).toEqual([10]);
});

test("a bill in your own currency has no exchange rate to set", async ({ page, request }) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "5000");
	await api.subscription({ name: "Wifi", amount: "646.92", account_id: id, amount_varies: true });
	await api.get("/subscriptions");

	await open(page, "/plan");
	await page.getByRole("button", { name: "Enter the real amount" }).click();
	const dialog = page.getByRole("dialog", { name: "Mark as paid" });
	await expect(dialog.getByLabel("Amount")).toBeVisible();
	await expect(dialog.getByLabel("Exchange rate")).toHaveCount(0);
	await dialog.getByLabel("Amount").fill("700");
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	const paid = (await api.get<Tx[]>("/transactions")).find(
		(t) => t.category === "Entertainment" || t.description === "Wifi",
	);
	expect(Number(paid?.amount)).toBe(700);
});

test("the Subscriptions page marks a varying bill and its form has the switch", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "5000");
	await api.subscription({ name: "VPS", amount: "50", account_id: id, amount_varies: true });
	await api.subscription({ name: "Rent", amount: "900", account_id: id });

	await open(page, "/subscriptions");
	await expect(page.getByText(/about\s+MVR\s50\.00/)).toBeVisible();
	await expect(page.getByText(/about\s+MVR\s900\.00/)).toBeHidden();

	// the card of the VPS bill: the innermost block holding its name and an Edit button
	const card = page
		.locator("div")
		.filter({ has: page.getByText("VPS", { exact: true }) })
		.filter({ has: page.getByRole("button", { name: "Edit" }) })
		.last();
	await card.getByRole("button", { name: "Edit" }).click();
	const dialog = page.getByRole("dialog", { name: "Edit subscription" });
	const flag = dialog.getByRole("switch", { name: "The amount changes from month to month" });
	await expect(flag).toBeChecked();
	await flag.uncheck();
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText(/about\s+MVR/)).toHaveCount(0);
});
