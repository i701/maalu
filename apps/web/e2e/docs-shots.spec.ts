import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

/**
 * Makes the screenshots the guides show (`just docs-shots`; left out of every other run). It seeds
 * a user with the made-up demo data (`app.seed`), signs in as them, adds a credit card, and saves a
 * WebP of each screen into `public/docs/`. Chromium writes the WebP itself (a canvas), so nothing
 * extra is installed. The sizes it prints are the `width` and `height` of the guides' image blocks.
 */
const EMAIL = "shots@example.com";
const PASSWORD = "maalu-demo-1234"; // the seed's password
const DATABASE_URL =
	process.env.E2E_DATABASE_URL ?? "postgresql+asyncpg://maalu:maalu@localhost:5432/maalu_e2e";
const OUT = "public/docs";
const WIDTH = 1180; // the page content's width: the viewport is this plus the sidebar and margins
const MAX_HEIGHT = 900;
const PAD = 28; // breathing room round every shot
const BANNER_GAP = 16; // the gap kept between the page banner and the shot

test.use({ viewport: { width: WIDTH + 330, height: 1000 }, reducedMotion: "reduce" });

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

/** The made-up demo data, in the e2e database, for one user. */
function seedDemoUser() {
	execFileSync("uv", ["run", "python", "-m", "app.seed", "--email", EMAIL], {
		cwd: "../api",
		env: {
			...process.env,
			DATABASE_URL,
			SECRET_KEY: "e2e-not-a-secret-e2e-not-a-secret-e2e-not-a-secret",
		},
		stdio: "pipe",
	});
}

test("the screenshots for the guides", async ({ page, context }) => {
	test.setTimeout(240_000);
	mkdirSync(OUT, { recursive: true });
	seedDemoUser();

	const converter = await context.newPage();
	await converter.goto("about:blank");

	const sizes: Record<string, string> = {};
	/** Save `name`.webp: the page's content below its banner (not the sidebar), or one element, at
	 * most MAX_HEIGHT tall. */
	async function shoot(name: string, target?: ReturnType<Page["locator"]>) {
		await page.waitForTimeout(500);
		const box = await (target ?? page.locator("main > .MuiContainer-root")).boundingBox();
		expect(box, name).not.toBeNull();
		let top = box!.y;
		// skip the page banner: every page has the same one and it costs a third of the height
		if (!target) {
			// the banner is the h1's nearest ancestor with the gradient background
			const bottom = await page.locator("main h1").evaluate((h1) => {
				let node: HTMLElement | null = h1 as HTMLElement;
				while (node && !getComputedStyle(node).backgroundImage.includes("linear-gradient"))
					node = node.parentElement;
				return node ? node.getBoundingClientRect().bottom : 0;
			});
			top = Math.max(top, bottom + BANNER_GAP);
		}
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

	await open(page, "/compare?preset=this_month");
	await expect(page.getByRole("heading", { name: "Compare", level: 1 })).toBeVisible();
	await shoot("compare");

	console.log(`\nScreenshots written to ${OUT}:\n${JSON.stringify(sizes, null, 2)}`);
});
