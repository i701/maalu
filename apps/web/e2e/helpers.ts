import { expect, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:8101/api/v1";
export const PASSWORD = "e2e-password-1234";

let counter = 0;

/** A user nobody else in the run shares. */
export function newEmail(): string {
	counter += 1;
	return `e2e-${Date.now()}-${process.pid}-${counter}@example.com`;
}

/** Open a page and wait until its scripts have loaded, so a form is not submitted the plain-HTML
 * way (and reloaded empty) before React takes over. */
export async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState("networkidle");
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
		account: (name: string, opening_amount = "0", group = "accounts") =>
			post<{ id: string }>("/accounts", { name, group, currency: "MVR", opening_amount }),
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
