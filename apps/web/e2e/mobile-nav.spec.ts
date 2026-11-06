import { expect, test } from "@playwright/test";
import { open, signUp } from "./helpers";

// a phone: the sidebar is hidden and the bottom bar is the way around
test.use({ viewport: { width: 375, height: 812 } });

test("on a phone, More in the bottom bar reaches every page", async ({ page }) => {
	await signUp(page);
	await open(page, "/dashboard");
	const bar = page.getByRole("navigation", { name: "Main" }).filter({ visible: true });
	await expect(bar.getByRole("link")).toHaveCount(4);

	const more = bar.getByRole("button", { name: "More" });
	await more.click();
	const sheet = page.getByRole("dialog", { name: "All pages" });
	for (const name of ["Trends", "Month plan", "Pending", "Categories", "Trash", "Docs"]) {
		await expect(sheet.getByRole("link", { name })).toBeVisible();
	}

	// picking one goes there and closes the sheet, and More shows it is where you are
	await sheet.getByRole("link", { name: "Trends" }).click();
	await expect(page).toHaveURL(/\/trends/);
	await expect(sheet).toBeHidden();
	await expect(more).toHaveClass(/nav-current/);

	// back on one of the bar's own pages, More is not the current one
	await bar.getByRole("link", { name: "Budget" }).click();
	await expect(page).toHaveURL(/\/budget/);
	await expect(more).not.toHaveClass(/nav-current/);
});
