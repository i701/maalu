import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { User } from "#/types/api";
import { apiRequest } from "./api";
import { jwtExpiry, getAppSession } from "#/utils/session";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

const registerSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(128),
	base_currency: z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code"),
});

/** Exchange credentials for the API's JWT and store it in the cookie session. */
async function startSession(email: string, password: string) {
	const login = await apiRequest<{ access_token: string }>("/auth/login", {
		method: "POST",
		anonymous: true,
		form: new URLSearchParams({ username: email, password }),
	});
	if (!login.ok) return login;

	const token = login.data.access_token;
	const me = await apiRequest<User>("/users/me", { token });
	if (!me.ok) return me;

	// Cookie lifetime matches the token's, so an expired token can't linger in a live cookie.
	const expiresAt = jwtExpiry(token);
	const maxAge = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : undefined;
	const session = await getAppSession(maxAge);
	await session.update({
		token,
		expiresAt,
		user: { id: me.data.id, email: me.data.email, base_currency: me.data.base_currency },
	});
	return { ok: true as const, data: null };
}

export const loginFn = createServerFn({ method: "POST" })
	.validator(loginSchema)
	.handler(async ({ data }) => startSession(data.email, data.password));

export const registerFn = createServerFn({ method: "POST" })
	.validator(registerSchema)
	.handler(async ({ data }) => {
		const created = await apiRequest<User>("/auth/register", {
			method: "POST",
			anonymous: true,
			body: data,
		});
		if (!created.ok) return created;
		return startSession(data.email, data.password);
	});

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	const session = await getAppSession();
	await session.clear();
	return { ok: true as const };
});

/** Cookie-only check (no API call). Returns the cached user, never the token. */
export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
	const { token, expiresAt, user } = (await getAppSession()).data;
	if (!token || !user) return null;
	if (expiresAt && expiresAt * 1000 <= Date.now()) return null;
	return { user };
});

/** Change your settings. Only the fields sent change; `null` clears the default account. */
export const updateMeFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			default_account_id: z.uuid().nullable().optional(),
			start_from_template: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => apiRequest<User>("/users/me", { method: "PATCH", body: data }));

export const getMeFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<User>("/users/me"),
);
