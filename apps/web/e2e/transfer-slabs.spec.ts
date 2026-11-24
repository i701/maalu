import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type TransferRow = {
	type: string;
	amount: string;
	to_amount: string | null;
	account: { name: string } | null;
	to_account: { name: string } | null;
};

test("a transfer is two slabs: pick each account from a list, swap them, and type what arrived", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("BML Current", "1000", "accounts", { bank: "BML", account_number: "7770" });
	await api.account("MIB Savings", "500", "savings", { bank: "MIB" });
	await api.account("BML USD", "100", "accounts", {
		bank: "BML",
		currency: "USD",
		exchange_rate: "15.42",
	});

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Transfer" }).click();

	// each slab's account comes from a list that grows out of it; Escape closes the list, not the form
	const from = form.getByRole("group", { name: "From" });
	const to = form.getByRole("group", { name: "To" });
	await from.getByRole("button", { name: /^From: .*Choose another account/ }).click();
	await expect(form.getByRole("listbox", { name: "From account" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(form.getByRole("listbox", { name: "From account" })).toBeHidden();
	await expect(form).toBeVisible();

	await from.getByRole("button", { name: /^From:/ }).click();
	await form.getByRole("option", { name: /BML Current/ }).click();
	await to.getByRole("button", { name: /^To:/ }).click();
	await form.getByRole("option", { name: /MIB Savings/ }).click();
	await expect(from.getByRole("button", { name: /^From: BML Current/ })).toBeVisible();
	await expect(to.getByRole("button", { name: /^To: MIB Savings/ })).toBeVisible();
	// the number and the balance of the account show on its slab
	await expect(from.getByText("7770 · ")).toBeVisible();

	await form.getByLabel("Amount", { exact: true }).fill("250");

	// the arrow swaps the two accounts
	await form.getByRole("button", { name: "Swap the accounts" }).click();
	await expect(from.getByRole("button", { name: /^From: MIB Savings/ })).toBeVisible();
	await expect(to.getByRole("button", { name: /^To: BML Current/ })).toBeVisible();

	// picking the account on the other side swaps too, and a dollar account asks what arrived
	await to.getByRole("button", { name: /^To:/ }).click();
	await form.getByRole("option", { name: /BML USD/ }).click();
	await expect(from.getByRole("button", { name: /^From: MIB Savings/ })).toBeVisible();
	await expect(to.getByRole("button", { name: /^To: BML USD/ })).toBeVisible();
	await expect(form.getByText("Different currencies: type what arrived")).toBeVisible();
	await form.getByLabel("What arrived").fill("16.21");

	await form.getByRole("button", { name: "Save", exact: true }).click();
	await expect(form).toBeHidden();

	const rows = await api.get<TransferRow[]>("/transactions");
	const made = rows.find((r) => r.type === "transfer");
	expect(made?.account?.name).toBe("MIB Savings");
	expect(made?.to_account?.name).toBe("BML USD");
	expect(Number(made?.amount)).toBe(250);
	expect(Number(made?.to_amount)).toBe(16.21);
});

test("picking the account on the other side swaps the two, and the amounts with them between currencies", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("BML Current", "1000");
	await api.account("BML USD", "100", "accounts", { currency: "USD", exchange_rate: "15.42" });

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Transfer" }).click();
	const from = form.getByRole("group", { name: "From" });
	const to = form.getByRole("group", { name: "To" });

	await from.getByRole("button", { name: /^From:/ }).click();
	await form.getByRole("option", { name: /BML Current/ }).click();
	await to.getByRole("button", { name: /^To:/ }).click();
	await form.getByRole("option", { name: /BML USD/ }).click();
	await form.getByLabel("Amount", { exact: true }).fill("154.20");
	await form.getByLabel("What arrived").fill("10");

	// the dollar account is on the To side: picking it as From trades the sides and the figures
	await from.getByRole("button", { name: /^From:/ }).click();
	await form.getByRole("option", { name: /BML USD/ }).click();
	await expect(from.getByRole("button", { name: /^From: BML USD/ })).toBeVisible();
	await expect(to.getByRole("button", { name: /^To: BML Current/ })).toBeVisible();
	await expect(form.getByLabel("Amount", { exact: true })).toHaveValue("10");
	await expect(form.getByLabel("What arrived")).toHaveValue("154.20");
});

test("the swap arrow moves a lone account to the other side", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("BML Current", "1000");
	await api.account("MIB Savings", "500", "savings");

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Transfer" }).click();
	const from = form.getByRole("group", { name: "From" });
	const to = form.getByRole("group", { name: "To" });
	const swap = form.getByRole("button", { name: "Swap the accounts" });

	// nothing chosen: nothing to swap
	await expect(swap).toBeDisabled();

	await from.getByRole("button", { name: /^From:/ }).click();
	await form.getByRole("option", { name: /BML Current/ }).click();
	await expect(swap).toBeEnabled();
	await swap.click();
	await expect(to.getByRole("button", { name: /^To: BML Current/ })).toBeVisible();
	await expect(from.getByRole("button", { name: /^From: no account/ })).toBeVisible();
});
