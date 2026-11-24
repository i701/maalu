import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("a balance adjustment leaves no category to sort or pick, and still reads as an adjustment", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const account = await api.account("Wallet", "100");
	await api.post(`/accounts/${account.id}/adjust`, { new_balance: "140" });

	// it is in the list, named for what it is, and marked as an adjustment
	await open(page, "/transactions");
	await expect(page.getByRole("button", { name: /Balance adjustment/ }).first()).toBeVisible();

	// but there is no category for it: the category list has nothing to show or sort
	await open(page, "/categories");
	await expect(page.getByText("Balance adjustment")).toHaveCount(0);
	await expect(page.getByRole("button", { name: /Needs and wants/ })).toHaveCount(0);
});
