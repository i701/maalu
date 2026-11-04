import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type Account = { id: string; name: string; balance: string };
type Goal = { id: string; saved: string };

/** The first day of this month, which is never in the future. */
const day = () =>
	new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().slice(0, 10);

test("rules split a new salary, and the split can be undone", async ({ page, request }) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const main = await api.account("Main", "0");
	const savings = await api.account("Savings", "0");
	const trip = await api.post<Goal>("/goals", { name: "Trip", target_amount: "15000" });
	await api.post("/salary-rules", { mode: "percent", value: "20", account_id: savings.id });
	await api.post("/salary-rules", { mode: "fixed", value: "1500", goal_id: trip.id });

	// the rules are listed in Settings
	await open(page, "/settings");
	await expect(page.getByText("20% of each salary")).toBeVisible();
	await expect(page.getByText(/MVR\s1,500\.00 each time/)).toBeVisible();

	// adding a salary opens the split by itself, with every line worked out
	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Income" }).click();
	await form.getByLabel("Amount").fill("10000");
	await form.getByLabel("Account").click();
	await page.getByRole("option", { name: /^Main/ }).click();
	await form.getByRole("combobox", { name: /^Category/ }).fill("Salary");
	await page.getByRole("option", { name: "Salary" }).click();
	await form.getByRole("button", { name: "Save", exact: true }).click();

	const split = page.getByRole("dialog", { name: "Split this salary" });
	await expect(split).toBeVisible();
	await expect(split.getByLabel("Amount for Savings")).toHaveValue("2000.00");
	await expect(split.getByLabel("Amount for Trip")).toHaveValue("1500.00");
	await expect(
		split.getByText(/Moving MVR\s3,500\.00\. MVR\s6,500\.00 stays in Main/),
	).toBeVisible();

	// an amount can be changed, and sending more than the salary is refused
	await split.getByLabel("Amount for Savings").fill("9000");
	await expect(split.getByText("These add up to more than the salary.")).toBeVisible();
	await expect(split.getByRole("button", { name: "Make the split" })).toBeDisabled();
	await split.getByLabel("Amount for Savings").fill("2500");
	await split.getByRole("button", { name: "Make the split" }).click();
	// the transfer into Savings is now in the list
	await expect(page.getByText("From salary: Savings")).toBeVisible();

	// the money moved, and the goal has its share
	const balance = async (id: string) => Number((await api.get<Account>(`/accounts/${id}`)).balance);
	const saved = async () => Number((await api.get<Goal[]>("/goals"))[0].saved);
	await expect.poll(() => balance(main.id)).toBe(7500);
	expect(await balance(savings.id)).toBe(2500);
	expect(await saved()).toBe(1500);

	// it can't be done twice: the button now shows what was made, and undoes it
	await expect(page.getByRole("dialog")).toBeHidden();
	await page.getByRole("button", { name: "Split salary" }).click();
	const done = page.getByRole("dialog", { name: "This salary was split" });
	await expect(done.getByText(/Savings: MVR\s2,500\.00 moved/)).toBeVisible();
	await expect(done.getByText(/Trip: MVR\s1,500\.00 set aside/)).toBeVisible();
	await done.getByRole("button", { name: "Undo the split" }).click();
	await expect(page.getByText("From salary: Savings")).toBeHidden();
	await expect.poll(() => balance(main.id)).toBe(10000);
	expect(await balance(savings.id)).toBe(0);
	expect(await saved()).toBe(0);
});

test("a salary with no rules says where to set them up", async ({ page, request }) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	const { id } = await api.account("Main", "0");
	await api.transaction({
		type: "income",
		amount: "500.00",
		account_id: id,
		category: "Salary",
		transaction_date: day(),
	});
	await open(page, "/transactions");
	await page.getByRole("button", { name: "Split salary" }).click();
	await expect(page.getByText("You haven't set up any rules yet.")).toBeVisible();
	await page.getByRole("link", { name: "Choose how your salary is split" }).click();
	await expect(page).toHaveURL(/\/settings/);
});
