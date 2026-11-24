import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

test("an account shows its bank as a chip, with a logo for MIB and BML", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Salary account", "100", "accounts", { bank: "MIB", account_number: "7730" });
	await api.account("Spending", "100", "accounts", { bank: "BML" });
	await api.account("Old savings", "100", "accounts", { bank: "SBI" });

	await open(page, "/accounts");
	const main = page.getByRole("main");
	// the bank is a chip beside the name; the line under the name keeps just the number
	await expect(main.getByText("MIB", { exact: true }).first()).toBeVisible();
	await expect(main.getByText("SBI", { exact: true }).first()).toBeVisible();
	await expect(main.getByText("7730", { exact: true })).toBeVisible();
	await expect(main.getByText("MIB · 7730")).toHaveCount(0);

	// logos: one on each MIB and BML card and one on each of their filter chips; SBI has none
	await expect(main.locator("img")).toHaveCount(4);
	await main.getByRole("button", { name: "SBI" }).click();
	await expect(page).toHaveURL(/bank=SBI/);
	await expect(main.getByText("Old savings")).toBeVisible();
	await expect(main.getByText("Salary account")).toBeHidden();
});
