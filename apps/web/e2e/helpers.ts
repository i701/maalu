import { createHmac } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:8101/api/v1";
export const PASSWORD = "e2e-password-1234";

let counter = 0;

/** A user nobody else in the run shares. */
export function newEmail(): string {
	counter += 1;
	return `e2e-${Date.now()}-${process.pid}-${counter}@example.com`;
}

/** Wait until React has taken over the page. The server renders real HTML first, so a click or a
 * form submit before this goes the plain-HTML way (a sign-up form reloads as `/register?email=…`).
 * "No network traffic" is not enough: the scripts can be in while hydration is still running, which
 * a slow or busy machine stretches past it. React marks the elements it owns with `__reactProps$…`,
 * so that is what is waited for. */
export async function hydrated(page: Page) {
	await page.waitForLoadState("networkidle");
	await page.waitForFunction(
		() =>
			[...document.querySelectorAll("button, a, input, form")].some((el) =>
				Object.keys(el).some((key) => key.startsWith("__reactProps$")),
			),
		undefined,
		{ timeout: 30_000 },
	);
}

/** Open a page and wait until it is interactive, so a form is not submitted the plain-HTML way
 * (and reloaded empty) before React takes over. */
export async function open(page: Page, path: string) {
	await page.goto(path);
	await hydrated(page);
}

/** Sign up through the real sign-up page and land on the dashboard. */
export async function signUp(page: Page, email = newEmail()): Promise<string> {
	await open(page, "/register");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	return email;
}

/** A client for the API as this user, to set up data without clicking through the app. */
export async function apiAs(request: APIRequestContext, email: string) {
	const login = await request.post(`${API}/auth/login`, {
		form: { username: email, password: PASSWORD },
	});
	expect(login.ok()).toBeTruthy();
	const { access_token } = await login.json();
	const headers = { Authorization: `Bearer ${access_token}` };

	async function post<T>(path: string, data: object): Promise<T> {
		const res = await request.post(`${API}${path}`, { headers, data });
		expect(res.ok(), `${path}: ${await res.text()}`).toBeTruthy();
		return res.json() as Promise<T>;
	}

	async function get<T>(path: string): Promise<T> {
		const res = await request.get(`${API}${path}`, { headers });
		expect(res.ok(), `${path}: ${await res.text()}`).toBeTruthy();
		return res.json() as Promise<T>;
	}

	return {
		get,
		post,
		account: (name: string, opening_amount = "0", group = "accounts", extra: object = {}) =>
			post<{ id: string }>("/accounts", { name, group, currency: "MVR", opening_amount, ...extra }),
		subscription: (data: object) =>
			post<{ id: string }>("/subscriptions", {
				currency: "MVR",
				category: "Entertainment",
				payment_method: "bank_transfer",
				interval_unit: "month",
				interval_count: 1,
				start_date: new Date().toISOString().slice(0, 10),
				...data,
			}),
		transaction: (data: object) =>
			post<{ id: string }>("/transactions", {
				currency: "MVR",
				category: "Uncategorized",
				payment_method: "bank_transfer",
				transaction_date: new Date().toISOString().slice(0, 10),
				...data,
			}),
	};
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** The 6-digit code an authenticator app shows for `secret` (RFC 6238: SHA-1, 30-second steps).
 * `steps` moves it that many steps on from now: the API accepts a step either side of its own and
 * each step only once, so a second code in a test has to come from the next step. */
export function totp(secret: string, steps = 0): string {
	let bits = "";
	for (const ch of secret.replace(/[=\s]/g, "").toUpperCase())
		bits += BASE32.indexOf(ch).toString(2).padStart(5, "0");
	const key = Buffer.from(
		Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
			Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2),
		),
	);
	const step = Buffer.alloc(8);
	step.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + steps));
	const hmac = createHmac("sha1", key).update(step).digest();
	const offset = hmac[hmac.length - 1] & 0xf;
	const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
	return String(binary % 1_000_000).padStart(6, "0");
}

/** Sign in on the sign-in page with a password (no second step yet). */
export async function signIn(page: Page, email: string) {
	await open(page, "/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
}

/** Sign out from the account menu. */
export async function signOut(page: Page) {
	await page
		.getByRole("button", { name: /account|profile|menu/i })
		.first()
		.click();
	await page.getByRole("menuitem", { name: /sign out|log out/i }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.waitForLoadState("networkidle");
}
