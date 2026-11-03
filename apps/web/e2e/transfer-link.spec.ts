import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** MIB to BML, 500, entered the two-row way: an expense on one side and an income on the other. */
async function twoRowTransfer(page: Page, request: APIRequestContext) {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const mib = await api.account("MIB Debit", "2000", "debit_card");
	const bml = await api.account("BML Current", "300");
	await api.transaction({
		type: "expense",
		amount: "500.00",
		account_id: mib.id,
		description: "Sent to BML",
	});
	await api.transaction({
		type: "income",
		amount: "500.00",
		account_id: bml.id,
		description: "From MIB",
	});
	return api;
}

test("merging a suggested pair makes one transfer and trashes the income", async ({
	page,
	request,
}) => {
	await twoRowTransfer(page, request);
	await open(page, "/transactions");

	await page.getByRole("button", { name: /Possible transfers/ }).click();
	await expect(page.getByText("MIB Debit").first()).toBeVisible();
	await page.getByRole("button", { name: "Merge" }).click();

	await expect(page.getByText("Made one transfer. The other entry is in the trash")).toBeVisible();
	await expect(page.getByText("MIB Debit → BML Current")).toBeVisible();
	await expect(page.getByRole("button", { name: /Possible transfers/ })).toBeHidden();
	await expect(page.getByText("From MIB")).toBeHidden();

	await open(page, "/trash");
	await expect(page.getByText("From MIB")).toBeVisible();
});

test("'Not a pair' stops the pair being suggested again", async ({ page, request }) => {
	await twoRowTransfer(page, request);
	await open(page, "/transactions");

	await page.getByRole("button", { name: /Possible transfers/ }).click();
	await page.getByRole("button", { name: "Not a pair" }).click();
	await expect(page.getByRole("button", { name: /Possible transfers/ })).toBeHidden();

	await open(page, "/transactions");
	await expect(page.getByRole("button", { name: /Possible transfers/ })).toBeHidden();
	await expect(page.getByText("Sent to BML")).toBeVisible();
	await expect(page.getByText("From MIB")).toBeVisible();
});

test("two ticked rows can be made into one transfer by hand", async ({ page, request }) => {
	await twoRowTransfer(page, request);
	await open(page, "/transactions");

	for (const box of await page.getByRole("checkbox").all()) await box.check();
	await page.getByRole("button", { name: "Make a transfer" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Make transfer" }).click();

	await expect(page.getByText("MIB Debit → BML Current")).toBeVisible();
	await expect(page.getByText("From MIB")).toBeHidden();
});

test("a lone expense gets no suggestion", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const mib = await api.account("MIB Debit", "2000", "debit_card");
	await api.transaction({
		type: "expense",
		amount: "500.00",
		account_id: mib.id,
		description: "Rent",
	});

	await open(page, "/transactions");
	await expect(page.getByText("Rent")).toBeVisible();
	await expect(page.getByRole("button", { name: /Possible transfers/ })).toBeHidden();
});
