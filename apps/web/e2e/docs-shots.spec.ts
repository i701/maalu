import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { open } from "./helpers";

/**
 * Makes the screenshots the guides show (`just docs-shots`; left out of every other run). It seeds
 * a user with the made-up demo data (`app.seed`), signs in as them, adds a credit card, and saves a
 * WebP of each screen into `public/docs/`. Chromium writes the WebP itself (a canvas), so nothing
 * extra is installed. The sizes it prints are the `width` and `height` of the guides' image blocks.
 */
const API = "http://localhost:8101/api/v1";
const EMAIL = "shots@example.com";
const PASSWORD = "maalu-demo-1234"; // the seed's password
const DATABASE_URL =
	process.env.E2E_DATABASE_URL ?? "postgresql+asyncpg://maalu:maalu@localhost:5432/maalu_e2e";
const OUT = "public/docs";
const WIDTH = 1180; // the page content's width: the viewport is this plus the sidebar and margins
const MAX_HEIGHT = 900;
const PAD = 28; // breathing room round every shot
const BANNER = 278; // the page banner's height (262px) and the gap under it

test.use({ viewport: { width: WIDTH + 330, height: 1000 }, reducedMotion: "reduce" });

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d;
};
const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * A PNG as a small WebP, converted by the browser's own canvas, with `PAD` px of the page's own
 * background round it so the cards' rounded corners are not cut off. A shot that was cut short
 * (`cut`) fades out at the bottom, so it reads as "and more below" rather than as a mistake.
 */
async function toWebp(converter: Page, png: Buffer, background: string, cut: boolean) {
	const url = await converter.evaluate(
		async ({ b64, bg, pad, fade }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${b64}`;
			await image.decode();
			const canvas = document.createElement("canvas");
			canvas.width = image.naturalWidth + pad * 2;
			canvas.height = image.naturalHeight + pad * 2;
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("no canvas");
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(image, pad, pad);
			if (fade) {
				const bottom = pad + image.naturalHeight;
				const gradient = ctx.createLinearGradient(0, bottom - 90, 0, bottom);
				gradient.addColorStop(0, "rgba(255,255,255,0)");
				gradient.addColorStop(1, bg);
				ctx.fillStyle = gradient;
				ctx.fillRect(0, bottom - 90, canvas.width, 90);
			}
			return canvas.toDataURL("image/webp", 0.8);
		},
		{ b64: png.toString("base64"), bg: background, pad: PAD, fade: cut },
	);
	return Buffer.from(url.split(",")[1], "base64");
}

async function setUp(request: APIRequestContext) {
	execFileSync("uv", ["run", "python", "-m", "app.seed", "--email", EMAIL], {
		cwd: "../api",
		env: {
			...process.env,
			DATABASE_URL,
			SECRET_KEY: "e2e-not-a-secret-e2e-not-a-secret-e2e-not-a-secret",
		},
		stdio: "pipe",
	});
	const login = await request.post(`${API}/auth/login`, {
		form: { username: EMAIL, password: PASSWORD },
	});
	expect(login.ok()).toBeTruthy();
	const headers = { Authorization: `Bearer ${(await login.json()).access_token}` };
	const post = async <T>(path: string, data: object) => {
		const res = await request.post(`${API}${path}`, { headers, data });
		expect(res.ok(), `${path}: ${await res.text()}`).toBeTruthy();
		return (await res.json()) as T;
	};

	// A credit card whose statement closed five days ago and falls due in a few, repaid from the
	// bank account the seed made.
	const accounts = await (await request.get(`${API}/accounts`, { headers })).json();
	const bank = accounts.find((a: { name: string }) => a.name === "BML Current");
	const visa = await post<{ id: string }>("/accounts", {
		name: "BML Visa",
		group: "card",
		currency: "MVR",
		credit_limit: "15000",
		statement_day: day(-5).getDate(),
		due_day: day(4).getDate(),
	});
	await post("/cards", {
		name: "BML Visa",
		kind: "credit",
		last_digits: "4164",
		account_id: visa.id,
		repay_account_id: bank.id,
	});
	const spend = (amount: string, category: string, ago: number, description: string) =>
		post("/transactions", {
			type: "expense",
			amount,
			currency: "MVR",
			category,
			description,
			payment_method: "credit_card",
			account_id: visa.id,
			transaction_date: iso(day(-ago)),
		});
	await spend("2850.00", "Shopping", 14, "Phone case and charger");
	await spend("1240.50", "Dining", 9, "Dinner out");
	await spend("3100.00", "Travel", 7, "Ferry tickets");
	await spend("420.00", "Dining", 2, "Lunch"); // after the close: on the next statement
	return { visaId: visa.id };
}

test("the screenshots for the guides", async ({ page, request, context }) => {
	test.setTimeout(240_000);
	mkdirSync(OUT, { recursive: true });
	const { visaId } = await setUp(request);

	const converter = await context.newPage();
	await converter.goto("about:blank");

	const sizes: Record<string, string> = {};
	/** Save `name`.webp: the page's content below its banner (not the sidebar), or one element, at
	 * most MAX_HEIGHT tall. */
	async function shoot(name: string, target?: ReturnType<Page["locator"]>, banner = BANNER) {
		await page.waitForTimeout(500);
		const box = await (target ?? page.locator("main > .MuiContainer-root")).boundingBox();
		expect(box, name).not.toBeNull();
		let top = box!.y;
		// skip the page banner: every page has the same one and it costs a third of the height
		if (!target) top += banner;
		const clip = {
			x: box!.x,
			y: top,
			width: box!.width,
			height: Math.min(box!.y + box!.height - top, MAX_HEIGHT),
		};
		const png = await page.screenshot({ clip, fullPage: true });
		const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		const cut = clip.height >= MAX_HEIGHT;
		const webp = await toWebp(converter, png, background, cut);
		writeFileSync(`${OUT}/${name}.webp`, webp);
		const width = Math.round(clip.width) + PAD * 2;
		const height = Math.round(clip.height) + PAD * 2;
		sizes[name] = `${width}x${height}, ${Math.round(webp.length / 1024)} KB`;
	}

	await open(page, "/login");
	await page.getByLabel("Email").fill(EMAIL);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/dashboard/);

	await open(page, "/plan");
	await expect(page.getByRole("heading", { name: "Bills by day" })).toBeVisible();
	await shoot("month-plan");

	await open(page, `/accounts/${visaId}`);
	await expect(page.getByRole("heading", { name: "Statement" })).toBeVisible();
	await shoot("card-statement");

	await open(page, "/budget");
	await expect(page.getByRole("heading", { name: "Budget", level: 1 })).toBeVisible();
	await shoot("budget");

	await open(page, "/settings");
	const rules = page.locator(".MuiCard-root", {
		has: page.getByRole("heading", { name: "When my salary arrives" }),
	});
	await expect(rules).toBeVisible();
	await shoot("salary-rules", rules);

	await open(page, "/compare?preset=this_month");
	await expect(page.getByRole("heading", { name: "Compare", level: 1 })).toBeVisible();
	await shoot("compare", undefined, 225); // its banner is a little shorter

	console.log(`\nScreenshots written to ${OUT}:\n${JSON.stringify(sizes, null, 2)}`);
});
