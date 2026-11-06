import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

async function withRule(
	page: import("@playwright/test").Page,
	request: import("@playwright/test").APIRequestContext,
	rule = true,
) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "0");
	const savings = await api.account("Savings", "0", "savings");
	if (rule)
		await api.post("/salary-rules", { mode: "fixed", value: "1500", account_id: savings.id });
	return { api, main };
}

test("a salary whose split is waiting is a notification that leads to Pending", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const { api, main } = await withRule(page, request);
	await api.transaction({
		type: "income",
		amount: "10000.00",
		account_id: main.id,
		category: "Salary",
		description: "Salary",
		transaction_date: today(),
	});

	await open(page, "/notifications");
	await expect(page.getByText("A salary split is waiting")).toBeVisible();
	await expect(page.getByText(/Your salary of MVR\s10,000\.00 is ready to be split/)).toBeVisible();
	await page.getByText("A salary split is waiting").click();
	await expect(page).toHaveURL(/\/pending/);
});

test("marking a planned salary received offers the split with what really arrived", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const { api, main } = await withRule(page, request);
	await api.transaction({
		type: "income",
		amount: "10000.00",
		account_id: main.id,
		category: "Salary",
		description: "Pay day",
		transaction_date: today(),
		planned: true,
	});

	await open(page, "/plan");
	await page.getByRole("button", { name: "Received" }).click();
	const received = page.getByRole("dialog", { name: "Mark as received" });
	await received.getByLabel("Amount received").fill("9800");
	await received.getByRole("button", { name: "Save", exact: true }).click();

	// the split opens by itself, worked out from the 9,800 that arrived (a prompt: nothing moves yet)
	const split = page.getByRole("dialog", { name: "Split this salary" });
	await expect(split).toBeVisible();
	await expect(split.getByText(/MVR\s9,800\.00 arrived in Main/)).toBeVisible();
	await expect(split.getByLabel("Amount for Savings")).toHaveValue("1500.00");
	await split.getByRole("button", { name: "Cancel" }).click();
	await expect(split).toBeHidden();
});

test("with no salary rules, marking a salary received does not open a split", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const { api, main } = await withRule(page, request, false);
	await api.transaction({
		type: "income",
		amount: "5000.00",
		account_id: main.id,
		category: "Salary",
		description: "Pay day",
		transaction_date: today(),
		planned: true,
	});

	await open(page, "/plan");
	await page.getByRole("button", { name: "Received" }).click();
	const received = page.getByRole("dialog", { name: "Mark as received" });
	await received.getByRole("button", { name: "Save", exact: true }).click();
	await expect(received).toBeHidden();
	await expect(page.getByRole("dialog", { name: "Split this salary" })).toBeHidden();
});
