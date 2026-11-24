import { expect, test } from "@playwright/test";
import { apiAs, open, signUp } from "./helpers";

type Row = {
	description: string | null;
	amount: string;
	splits: { name: string; quantity: string; category: string; amount: string }[];
};

test("splitting by item is a table you edit in place, and the switch never moves", async ({
	page,
	request,
}) => {
	test.setTimeout(90_000);
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Wallet", "500");

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Expense" }).click();

	// the switch has one place, split or not
	const split = form.getByRole("switch", { name: "Split by item and category" });
	const before = await split.boundingBox();
	await split.check();
	await expect(form.getByRole("group", { name: "Item 1" })).toBeVisible();
	await expect(form.getByLabel(/^Category\s*\*?$/)).toBeHidden();
	// let the form finish its glide to the wider dialog before measuring again
	await page.waitForTimeout(700);
	const after = await split.boundingBox();
	expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);

	// one line per item: the quantity, price and category are in the same row as its name
	const first = form.getByRole("group", { name: "Item 1" });
	const nameBox = await first.getByLabel("Item 1", { exact: true }).boundingBox();
	const priceBox = await first.getByLabel("Price each of item 1").boundingBox();
	expect(Math.abs((priceBox?.y ?? 0) - (nameBox?.y ?? 0))).toBeLessThan(2);

	await first.getByLabel("Item 1", { exact: true }).fill("Milk");
	await first.getByLabel("Quantity of item 1").fill("2");
	await first.getByLabel("Price each of item 1").fill("12.50");
	await first.getByLabel("Category of item 1").fill("Groceries");
	await expect(first.getByText("25.00")).toBeVisible();

	const second = form.getByRole("group", { name: "Item 2" });
	await second.getByLabel("Item 2", { exact: true }).fill("Soap");
	await second.getByLabel("Price each of item 2").fill("8");
	await second.getByLabel("Category of item 2").fill("Household");
	await expect(form.getByText(/^MVR\s33\.00$/)).toBeVisible();

	// adding a row takes the keyboard to its name, and a row can be removed
	await form.getByRole("button", { name: "Add item" }).click();
	await expect(form.getByRole("textbox", { name: "Item 3", exact: true })).toBeFocused();
	await form.getByRole("button", { name: "Remove item 3" }).click();
	await expect(form.getByRole("group", { name: "Item 3" })).toHaveCount(0);

	await form.getByRole("button", { name: "Save", exact: true }).click();
	await expect(form).toBeHidden();

	const made = (await api.get<Row[]>("/transactions"))[0];
	expect(Number(made.amount)).toBe(33);
	expect(made.splits.map((s) => [s.name, s.category, Number(s.amount)])).toEqual([
		["Milk", "Groceries", 25],
		["Soap", "Household", 8],
	]);
});

test("the last item cannot be removed, and turning the split off puts the category back", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Wallet", "500");
	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Expense" }).click();

	const split = form.getByRole("switch", { name: "Split by item and category" });
	await split.check();
	await form.getByRole("button", { name: "Remove item 2" }).click();
	await expect(form.getByRole("button", { name: "Remove item 1" })).toBeDisabled();

	await split.uncheck();
	await expect(form.getByLabel(/^Category\s*\*?$/)).toBeVisible();
	await expect(form.getByRole("group", { name: "Item 1" })).toBeHidden();
});

test("the GST controls sit under the items like the foot of an invoice, with the subtotal and the tax worked out", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Wallet", "500");
	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Expense" }).click();
	await form.getByRole("switch", { name: "Split by item and category" }).check();

	const first = form.getByRole("group", { name: "Item 1" });
	await first.getByLabel("Item 1", { exact: true }).fill("Dinner");
	await first.getByLabel("Price each of item 1").fill("100");
	await first.getByLabel("Category of item 1").fill("Eating out");

	// below the last row, not above the table
	const gst = form.getByLabel("GST", { exact: true });
	const lastRow = await form.getByRole("group", { name: "Item 2" }).boundingBox();
	const gstBox = await gst.boundingBox();
	expect((gstBox?.y ?? 0) > (lastRow?.y ?? 0)).toBe(true);

	// 100 with 8% on top: a subtotal of 100, the GST of 8 and a total of 108
	await gst.click();
	await page.getByRole("option", { name: "Prices exclude GST" }).click();
	await form.getByLabel("GST rate (%)").fill("8");
	await expect(form.getByText("GST (8%)")).toBeVisible();

	// the GST box starts where "Subtotal" does, and where the form's right-hand column (the Time
	// field) does; the totals end where the remove buttons do
	const time = await form.getByLabel("Time", { exact: true }).boundingBox();
	const gstLeft = await gst.boundingBox();
	expect(Math.abs((gstLeft?.x ?? 0) - (time?.x ?? 99))).toBeLessThan(2);
	const subtotal = await form.getByText("Subtotal", { exact: true }).boundingBox();
	const select = await gst.boundingBox();
	expect(Math.abs((select?.x ?? 0) - (subtotal?.x ?? 99))).toBeLessThan(2);
	const total = await form
		.getByText(/^MVR\s108\.00$/)
		.last()
		.boundingBox();
	const remove = await form.getByRole("button", { name: "Remove item 1" }).boundingBox();
	expect(
		Math.abs((total?.x ?? 0) + (total?.width ?? 0) - ((remove?.x ?? 0) + (remove?.width ?? 0))),
	).toBeLessThan(6);
	await expect(form.getByText(/^MVR\s100\.00$/)).toBeVisible();
	await expect(form.getByText(/^MVR\s8\.00$/)).toBeVisible();
	// the row's amount and the total
	await expect(form.getByText(/^MVR\s108\.00$/)).toHaveCount(2);

	// prices that already include it: the same 100 holds 7.41 of GST
	await gst.click();
	await page.getByRole("option", { name: "Prices include GST" }).click();
	await expect(form.getByText(/^MVR\s92\.59$/)).toBeVisible();
	await expect(form.getByText(/^MVR\s7\.41$/)).toBeVisible();
});

test("a category list in an item row is wide enough, with a sub-category's parent under its name", async ({
	page,
	request,
}) => {
	const email = await signUp(page);
	const api = await apiAs(request, email);
	await api.account("Wallet", "500");
	const food = await api.post<{ id: string }>("/categories", { name: "Food & drink" });
	for (const name of ["Coffee", "Junk Food", "Restaurants"])
		await api.post("/categories", { name, parent_id: food.id });

	await open(page, "/transactions");
	await page.getByRole("button", { name: "Add transaction" }).first().click();
	const form = page.getByRole("dialog", { name: "Add transaction" });
	await form.getByRole("button", { name: "Expense" }).click();
	await form.getByRole("switch", { name: "Split by item and category" }).check();

	const field = form.getByRole("combobox", { name: "Category of item 1" });
	await field.click();
	const coffee = page.getByRole("option", { name: /Coffee/ });
	await expect(coffee).toBeVisible();

	// the parent is under the name, not squeezed in beside it
	const name = await coffee.getByText("Coffee", { exact: true }).boundingBox();
	const parent = await coffee.getByText("in Food & drink").boundingBox();
	expect((parent?.y ?? 0) - (name?.y ?? 0)).toBeGreaterThan(8);
	expect(Math.abs((parent?.x ?? 0) - (name?.x ?? 99))).toBeLessThan(2);

	// and the list is wider than the narrow cell it drops from, from the cell's left edge (the
	// text input sits a few px inside the outline the list lines up with)
	const list = await page.getByRole("listbox").boundingBox();
	const cell = await field.boundingBox();
	expect(list?.width ?? 0).toBeGreaterThanOrEqual(299);
	expect(Math.abs((list?.x ?? 0) - (cell?.x ?? 99))).toBeLessThan(10);
});
