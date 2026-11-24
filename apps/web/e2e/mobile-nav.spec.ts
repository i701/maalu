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

test.describe("a tablet", () => {
	test.use({ viewport: { width: 800, height: 900 } });

	test("gets the bottom bar across the screen, with no side rail", async ({ page }) => {
		await signUp(page);
		await open(page, "/dashboard");
		const bar = page.getByRole("navigation", { name: "Main" }).filter({ visible: true });
		await expect(bar.getByRole("link")).toHaveCount(4);
		const box = await bar.boundingBox();
		// the bar runs the whole width along the bottom edge, not down the side
		expect(box?.x).toBe(0);
		expect(box?.width).toBe(800);
		expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(900);
		// and the page starts at its own gutter, not beside a rail
		const main = await page.getByRole("main").boundingBox();
		expect(main?.x).toBe(0);
		const heading = await page.getByRole("heading", { name: "Dashboard", level: 1 }).boundingBox();
		expect(heading?.x ?? 999).toBeLessThan(100);
	});

	test("switches to the sidebar at 900px", async ({ page }) => {
		await signUp(page);
		await page.setViewportSize({ width: 900, height: 900 });
		await open(page, "/dashboard");
		const side = page.getByRole("navigation", { name: "Main" }).filter({ visible: true });
		expect((await side.getByRole("link").count()) > 4).toBe(true);
		expect((await side.boundingBox())?.width).toBe(264);
	});
});
