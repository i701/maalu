import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

/** The first day of this month, which is never in the future. */
function thisMonth(): string {
	const now = new Date();
	return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

test("a limit is a need or a want when all its categories are, and the budget adds them up", async ({
	page,
	request,
}) => {
	test.setTimeout(60_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Wallet", "5000");
	const need = (await api.post<{ id: string }>("/categories", { name: "Rent", kind: "need" })).id;
	const want = (await api.post<{ id: string }>("/categories", { name: "Games", kind: "want" })).id;
	await api.transaction({
		type: "expense",
		amount: "400.00",
		account_id: id,
		category: "Rent",
		transaction_date: thisMonth(),
	});
	await api.post("/budget/lines", { name: "Home", category_ids: [need], amount: "1000" });
	await api.post("/budget/lines", { name: "Fun", category_ids: [want], amount: "200" });

	await open(page, "/budget");
	// the chip on each card, and the same names in the summary with what was spent against them
	await expect(page.getByText("Needs", { exact: true })).toHaveCount(2);
	await expect(page.getByText("Wants", { exact: true })).toHaveCount(2);
	await expect(page.getByText(/MVR\s400\.00 of MVR\s1,000\.00/).first()).toBeVisible();
});
