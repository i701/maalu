import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("a planned transfer to savings comes off what is available, and marking it done moves the money", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "5000");
	const pot = await api.account("Pot", "0", "savings");
	await api.transaction({
		type: "transfer",
		amount: "1200",
		to_amount: "1200",
		account_id: main.id,
		to_account_id: pot.id,
		planned: true,
		category: undefined,
		description: "Monthly saving",
	});

	await open(page, "/plan");
	await expect(page.getByText("Monthly saving")).toBeVisible();
	await expect(page.getByText("Transfer", { exact: true })).toBeVisible();
	await expect(page.getByText(/^MVR\s3,800\.00$/).first()).toBeVisible(); // 5,000 less 1,200

	await page.getByRole("button", { name: "Mark as done" }).click();
	const dialog = page.getByRole("dialog", { name: "Mark as done" });
	await expect(dialog.getByLabel("Amount")).toHaveCount(0);
	await dialog
		.getByRole("button", { name: /Mark as done|Save/ })
		.last()
		.click();
	await expect(dialog).toBeHidden();

	await expect(page.getByText("Monthly saving")).toHaveCount(0);
	await expect(page.getByText(/^MVR\s3,800\.00$/).first()).toBeVisible();
});
