import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type Account = { id: string; name: string; balance: string };
type Summary = { income: string; expense: string };

/** A second person, in their own browser, signed up and on the Settings page. */
async function newPerson(browser: Browser, baseURL: string | undefined) {
	const context = await browser.newContext({ baseURL });
	const page = await context.newPage();
	const email = await signUp(page);
	await open(page, "/settings");
	return { page, email, close: () => context.close() };
}

/** Sign up, put a little of everything in the account, then download a backup from Settings. */
async function backedUp(page: Page, request: Parameters<typeof apiAs>[0], testInfo: TestInfo) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const wallet = await api.account("Wallet", "1000");
	const bank = await api.account("Bank", "200");
	await api.transaction({
		type: "expense",
		amount: "120.50",
		account_id: wallet.id,
		category: "Groceries",
		description: "Weekly shop",
		vendor_name: "Corner Shop",
		tags: ["Home"],
	});
	await api.transaction({
		type: "income",
		amount: "500.00",
		account_id: wallet.id,
		category: "Salary",
		description: "October pay",
	});
	await api.transaction({
		type: "transfer",
		amount: "100.00",
		account_id: wallet.id,
		to_account_id: bank.id,
		description: "Top up the bank",
	});
	await api.transaction({
		type: "expense",
		amount: "100.00",
		account_id: bank.id,
		description: "Dinner out",
		splits: [
			{ name: "Mains", category: "Dining", amount: "70.00" },
			{ name: "Drinks", category: "Dining", amount: "30.00" },
		],
	});

	await open(page, "/settings");
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Download backup" }).click(),
	]);
	const file = testInfo.outputPath("backup.json");
	await download.saveAs(file);
	return { api, email, file };
}

const accounts = async (api: Awaited<ReturnType<typeof apiAs>>) =>
	Object.fromEntries((await api.get<Account[]>("/accounts")).map((a) => [a.name, a.balance]));

test("a backup restores into a new account, with the same money in it", async ({
	page,
	request,
	browser,
	baseURL,
}, testInfo) => {
	test.setTimeout(90_000);
	const before = await backedUp(page, request, testInfo);
	const balances = await accounts(before.api);
	const totals = await before.api.get<Summary>("/transactions/summary");
	expect(balances).toEqual({ Wallet: "1279.5000", Bank: "200.0000" }); // 1000 - 120.50 + 500 - 100; 200 + 100 - 100

	const other = await newPerson(browser, baseURL);
	await other.page.locator('input[type="file"]').setInputFiles(before.file);
	await expect(other.page.getByText("Restored 2 accounts and 4 transactions")).toBeVisible();

	// the same balances and the same totals, found through the API as the new person
	const api = await apiAs(request, other.email);
	await expect.poll(() => accounts(api)).toEqual(balances);
	expect(await api.get<Summary>("/transactions/summary")).toEqual(totals);
	const old = await before.api.get<Account[]>("/accounts");
	const restored = await api.get<Account[]>("/accounts");
	expect(restored.map((a) => a.id).filter((id) => old.some((o) => o.id === id))).toEqual([]); // new ids

	// and in the app: the transactions, with their vendor, tag and items
	await open(other.page, "/transactions");
	await expect(other.page.getByText("Weekly shop")).toBeVisible();
	await expect(other.page.getByText("October pay")).toBeVisible();
	await expect(other.page.getByText("Corner Shop").first()).toBeVisible();
	await expect(other.page.getByText("Home").first()).toBeVisible();
	await expect(other.page.getByText("Dinner out")).toBeVisible();
	await open(other.page, "/accounts");
	await expect(other.page.getByText("1,279.50").first()).toBeVisible();
	await other.close();
});

test("a backup is refused by an account that already has data", async ({
	page,
	request,
}, testInfo) => {
	test.setTimeout(60_000);
	const { api, file } = await backedUp(page, request, testInfo);
	const balances = await accounts(api);

	await page.locator('input[type="file"]').setInputFiles(file);
	await expect(
		page.getByRole("alert").filter({ hasText: "This account already has data" }),
	).toBeVisible();
	expect(await accounts(api)).toEqual(balances); // nothing doubled
	expect((await api.get<Account[]>("/accounts")).length).toBe(2);
});

test("a damaged or foreign file is refused and nothing is restored", async ({
	page,
	request,
	browser,
	baseURL,
}, testInfo) => {
	test.setTimeout(90_000);
	const { file } = await backedUp(page, request, testInfo);
	const other = await newPerson(browser, baseURL);
	const input = other.page.locator('input[type="file"]');
	const api = await apiAs(request, other.email);

	// changed after it was made: the checksum no longer matches
	const damaged = testInfo.outputPath("damaged.json");
	writeFileSync(damaged, readFileSync(file, "utf8").replace("Weekly shop", "Weekly shoP"));
	await input.setInputFiles(damaged);
	await expect(other.page.getByRole("alert")).toContainText("damaged");

	// not a Maalu file at all
	await input.setInputFiles({
		name: "notes.json",
		mimeType: "application/json",
		buffer: Buffer.from('{"hello": "world"}'),
	});
	await expect(other.page.getByRole("alert")).toContainText("not a Maalu backup");

	expect(await api.get<Account[]>("/accounts")).toEqual([]);

	// the real file still goes in afterwards
	await input.setInputFiles(file);
	await expect(other.page.getByText("Restored 2 accounts and 4 transactions")).toBeVisible();
	await other.close();
});
