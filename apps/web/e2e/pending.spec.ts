import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type Account = { id: string; name: string; balance: string };

/** A user with Main (where pay lands), Savings (a rule that moves by itself) and Bills (a rule that
 * waits for approval). */
async function setUp(
	page: import("@playwright/test").Page,
	request: import("@playwright/test").APIRequestContext,
) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "0");
	const savings = await api.account("Savings", "0");
	const bills = await api.account("Bills", "0");
	await api.post("/salary-rules", {
		mode: "percent",
		value: "20",
		account_id: savings.id,
		auto: true,
	});
	await api.post("/salary-rules", { mode: "fixed", value: "1500", account_id: bills.id });
	const pay = (description: string, amount: string) =>
		api.transaction({
			type: "income",
			amount,
			account_id: main.id,
			category: "Salary",
			description,
			transaction_date: new Date().toISOString().slice(0, 10),
		});
	const balance = async (id: string) => Number((await api.get<Account>(`/accounts/${id}`)).balance);
	return { api, main, savings, bills, pay, balance };
}

test("an automatic rule moves by itself and the other waits to be approved", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const { main, savings, bills, pay, balance } = await setUp(page, request);
	await pay("November salary", "10000");
	expect(await balance(savings.id)).toBe(2000); // moved when the salary was posted
	expect(await balance(bills.id)).toBe(0); // still waiting

	await open(page, "/pending");
	await expect(page.getByLabel("1 waiting")).toBeVisible(); // the badge in the sidebar
	await expect(page.getByText("November salary")).toBeVisible();
	await expect(page.getByText(/Savings: MVR\s2,000\.00 moved/)).toBeVisible();
	await expect(page.getByText("Waiting for you", { exact: true })).toBeVisible();
	await expect(
		page.getByText(/Moving MVR\s1,500\.00 more\. MVR\s6,500\.00 stays in Main/),
	).toBeVisible();

	await page.getByRole("button", { name: "Approve" }).click();
	await expect(page.getByText(/Nothing is waiting/)).toBeVisible();
	await expect(page.getByLabel("1 waiting")).toBeHidden();
	expect(await balance(bills.id)).toBe(1500);
	expect(await balance(main.id)).toBe(6500);
});

test("a waiting split can be reviewed and edited before it is made", async ({ page, request }) => {
	test.setTimeout(90_000);
	const { bills, pay, balance } = await setUp(page, request);
	await pay("Pay", "10000");

	await open(page, "/pending");
	await page.getByRole("button", { name: "Review and edit" }).click();
	const dialog = page.getByRole("dialog", { name: "Finish splitting this salary" });
	// the line an automatic rule already made is shown, not offered again
	await expect(dialog.getByText("Already made").first()).toBeVisible();
	await dialog.getByLabel("Amount for Bills").fill("1000");
	await dialog.getByRole("button", { name: "Make the split" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText(/Nothing is waiting/)).toBeVisible();
	expect(await balance(bills.id)).toBe(1000);
});

test("dismissing a waiting split leaves the list, and it can still be split by hand", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const { pay, balance, bills } = await setUp(page, request);
	await pay("Bonus", "4000");

	await open(page, "/pending");
	await page.getByRole("button", { name: "Dismiss" }).click();
	await expect(page.getByText(/Nothing is waiting/)).toBeVisible();

	// the salary still has its Split salary button
	await open(page, "/transactions");
	await page.getByRole("button", { name: "Split salary" }).click();
	const dialog = page.getByRole("dialog", { name: "Finish splitting this salary" });
	await dialog.getByRole("button", { name: "Make the split" }).click();
	await expect(dialog).toBeHidden();
	expect(await balance(bills.id)).toBe(1500);
});

test("a rule can be switched to move automatically from Settings", async ({ page, request }) => {
	test.setTimeout(60_000);
	await setUp(page, request);
	await open(page, "/settings");
	// only the Savings rule moves by itself so far
	await expect(page.getByText("Moves automatically")).toHaveCount(1);
	await page.getByRole("button", { name: "Change the rule for Bills" }).click();
	const dialog = page.getByRole("dialog", { name: /Change the rule for Bills/ });
	await dialog.getByRole("switch", { name: /Move it automatically/ }).check();
	await dialog.getByRole("button", { name: "Save", exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("Moves automatically")).toHaveCount(2);
});

test("with nothing waiting the Pending screen points to the rules and the guide", async ({
	page,
}) => {
	await signUp(page);
	await open(page, "/pending");
	await expect(page.getByText(/Nothing is waiting/)).toBeVisible();
	await page.getByRole("link", { name: "how it works" }).click();
	await expect(page).toHaveURL(/\/docs\/salary-split$/);
});
