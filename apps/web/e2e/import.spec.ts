import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

// A made-up BML statement (the API's own test fixture): four rows, no real names or numbers.
const STATEMENT = new URL("../../api/tests/data/bml_statement.csv", import.meta.url).pathname;

async function setUp(page: Page, request: APIRequestContext) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("BML Current", "0");
	await open(page, "/import");
}

async function chooseStatement(page: Page) {
	await page.getByRole("combobox", { name: "Account" }).click();
	await page.getByRole("option", { name: /BML Current/ }).click();
	await page.locator('input[type="file"]').setInputFiles(STATEMENT);
	await expect(page.getByText("bml_statement.csv · BML Current · 4 rows")).toBeVisible();
}

test("a statement is reviewed, imported and shows up as transactions", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	await setUp(page, request);
	await chooseStatement(page);

	// nothing is saved yet: fix one row's vendor and category in the review
	await page.getByRole("button", { name: "Edit vendor and category of row 4" }).click();
	await page.getByRole("combobox", { name: "Vendor" }).fill("Power Company");
	await page.getByRole("combobox", { name: "Category" }).fill("Utilities");
	await page.getByRole("button", { name: "Save", exact: true }).click();

	await page.getByRole("button", { name: "Import 4 rows" }).click();
	const done = page.getByRole("dialog", { name: "Import finished" });
	await expect(done.getByText("Imported 4 transactions.")).toBeVisible();

	// the report lists every row and what happened to it
	const href = await done.getByRole("link", { name: /Download report/ }).getAttribute("href");
	const report = await page.request.get(href!);
	expect(report.ok()).toBeTruthy();
	const csv = await report.text();
	expect(csv).toContain("POWER COMPANY LTD");
	expect(csv.match(/Imported/g)).toHaveLength(4);
	await done.getByRole("button", { name: "Done" }).click();

	await open(page, "/transactions");
	await expect(page.getByText("Power Company").first()).toBeVisible();
	await expect(page.getByText("Utilities").first()).toBeVisible();
	await expect(page.getByText("PERSON TWO").first()).toBeVisible();
});

test("importing the same statement again does not duplicate anything", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	await setUp(page, request);
	await chooseStatement(page);
	await page.getByRole("button", { name: "Import 4 rows" }).click();
	await page
		.getByRole("dialog", { name: "Import finished" })
		.getByRole("button", { name: "Done" })
		.click();

	await chooseStatement(page);
	await expect(page.getByText(/already/i).first()).toBeVisible();
	await expect(page.getByRole("button", { name: "Import 4 rows" })).toBeHidden();
});

test("an import can be undone, which moves its transactions to the trash", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	await setUp(page, request);
	await chooseStatement(page);
	await page.getByRole("button", { name: "Import 4 rows" }).click();
	await page
		.getByRole("dialog", { name: "Import finished" })
		.getByRole("button", { name: "Done" })
		.click();

	await page.getByRole("button", { name: "Undo this import" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Undo import" }).click();
	await expect(page.getByText("Import undone")).toBeVisible();

	await open(page, "/transactions");
	await expect(page.getByText("PERSON TWO")).toBeHidden();
	await open(page, "/trash");
	await expect(page.getByText("PERSON TWO").first()).toBeVisible();
});
