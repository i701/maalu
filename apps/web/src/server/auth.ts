import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
	LoginResult,
	RecoveryCodes,
	RegistrationStatus,
	TwoFactorSetup,
	User,
} from "#/types/api";
import { apiRequest } from "./api";
import { getAppSession, getChallengeSession } from "#/utils/session";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

const registerSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(128),
	base_currency: z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code"),
});

/** Store the API's token in the cookie session: the user is signed in. */
async function finishSession(token: string) {
	const me = await apiRequest<User>("/users/me", { token });
	if (!me.ok) return me;

	const session = await getAppSession();
	await session.update({
		token,
		refreshedAt: Date.now(),
		user: { id: me.data.id, email: me.data.email, base_currency: me.data.base_currency },
	});
	return { ok: true as const, data: { twoFactor: false } };
}

/** Exchange credentials for a session token and store it in the cookie session. With two-factor on
 * there is no token yet: the proof of the password is kept and `twoFactor` says a code is next. */
async function startSession(email: string, password: string) {
	const login = await apiRequest<LoginResult>("/auth/login", {
		method: "POST",
		anonymous: true,
		form: new URLSearchParams({ username: email, password }),
	});
	if (!login.ok) return login;

	if (login.data.two_factor_required && login.data.challenge_token) {
		await (await getChallengeSession()).update({ challenge: login.data.challenge_token });
		return { ok: true as const, data: { twoFactor: true } };
	}
	return finishSession(login.data.access_token ?? "");
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

/** The second step of signing in: a code from the authenticator app, or a recovery code. */
export const verifyTwoFactorFn = createServerFn({ method: "POST" })
	.validator(z.object({ code: z.string().trim().min(6).max(32) }))
	.handler(async ({ data }) => {
		const pending = await getChallengeSession();
		const challenge = pending.data.challenge;
		if (!challenge) return { ok: false as const, status: 401, error: "Sign in again" };
		const res = await apiRequest<LoginResult>("/auth/login/2fa", {
			method: "POST",
			anonymous: true,
			body: { challenge_token: challenge, code: data.code },
		});
		if (!res.ok) {
			// Only a dead challenge ends the attempt; a wrong code can be tried again.
			if (res.error === "Sign in again") await pending.clear();
			return res;
		}
		await pending.clear();
		return finishSession(res.data.access_token ?? "");
	});

/** Give up on the code step (back to the password). */
export const cancelTwoFactorFn = createServerFn({ method: "POST" }).handler(async () => {
	await (await getChallengeSession()).clear();
	return { ok: true as const };
});

/** Sign out: end this session on the API, so its token stops working everywhere, then forget it
 * here. If the API cannot be reached the cookie is still cleared. */
export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	await apiRequest<void>("/auth/logout", { method: "POST" });
	await (await getAppSession()).clear();
	return { ok: true as const };
});

/** Whether sign-up is open (the API decides; see `REGISTRATION`). A failure counts as closed. */
export const getRegistrationFn = createServerFn({ method: "GET" }).handler(async () => {
	const res = await apiRequest<RegistrationStatus>("/auth/registration", { anonymous: true });
	return { open: res.ok && res.data.open };
});

/** Cookie-only check (no API call). Returns the cached user, never the token. */
export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
	const { token, user } = (await getAppSession()).data;
	if (!token || !user) return null;
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

const codeField = z.string().trim().min(6).max(32);

/** Start setting up an authenticator app: the secret and the QR code to scan. */
export const startTwoFactorFn = createServerFn({ method: "POST" }).handler(async () =>
	apiRequest<TwoFactorSetup>("/auth/2fa/setup", { method: "POST" }),
);

/** Turn two-factor on with a code from the app. Answers with the recovery codes, shown once. */
export const enableTwoFactorFn = createServerFn({ method: "POST" })
	.validator(z.object({ code: codeField }))
	.handler(async ({ data }) =>
		apiRequest<RecoveryCodes>("/auth/2fa/enable", { method: "POST", body: data }),
	);

const confirmSchema = z.object({ password: z.string().min(1).max(128), code: codeField });

export const disableTwoFactorFn = createServerFn({ method: "POST" })
	.validator(confirmSchema)
	.handler(async ({ data }) =>
		apiRequest<void>("/auth/2fa/disable", { method: "POST", body: data }),
	);

/** Make a new set of recovery codes (the old ones stop working), shown once. */
export const newRecoveryCodesFn = createServerFn({ method: "POST" })
	.validator(confirmSchema)
	.handler(async ({ data }) =>
		apiRequest<RecoveryCodes>("/auth/2fa/recovery-codes", { method: "POST", body: data }),
	);
