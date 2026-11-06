import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test("the dashboard lists what is coming up, and a notification says where the money runs out", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "1000");
	for (const [description, amount] of [
		["Rent", "800"],
		["Wifi", "400"],
	]) {
		await api.transaction({
			type: "expense",
			amount,
			account_id: id,
			category: "Bills",
			description,
			transaction_date: today(),
			planned: true,
		});
	}

	await open(page, "/dashboard");
	await expect(page.getByText("Coming up", { exact: true })).toBeVisible();
	await expect(page.getByText("Due today")).toHaveCount(2);
	await expect(page.getByText(/-MVR\s800\.00/)).toBeVisible();
	await expect(page.getByText(/-MVR\s400\.00/)).toBeVisible();
	await page.getByRole("link", { name: "Open the month plan" }).last().click();
	await expect(page).toHaveURL(/\/plan/);

	// 1,000 held, less 800 and 400 of bills: the money runs out at the second one
	await open(page, "/notifications");
	await expect(page.getByText(/The money runs out at/)).toBeVisible();
	await expect(page.getByText(/Short by MVR\s200\.00 after it/)).toBeVisible();
	await page.getByText(/The money runs out at/).click();
	await expect(page).toHaveURL(/\/plan/);
});

test("with nothing planned there is no coming-up list and no warning", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Main", "1000");
	await open(page, "/notifications");
	await expect(page.getByText(/The money runs out at/)).toHaveCount(0);
});
