import { useSession as openSession } from "@tanstack/react-start/server";

export type SessionUser = {
	id: string;
	email: string;
	base_currency: string;
};

// The API's session token lives only in this encrypted, httpOnly cookie; the browser never sees it.
export type SessionData = {
	token?: string;
	user?: SessionUser;
	/** When the cookie was last re-issued (ms), see `renewSession`. */
	refreshedAt?: number;
};

// How long the cookie lasts after its last renewal. The API decides how long a sign-in really lasts
// (30 days after its last use by default) and answers 401 when it ends, so this only needs to be
// longer than that.
const COOKIE_SECONDS = 90 * 24 * 60 * 60;
const RENEW_AFTER_MS = 6 * 60 * 60 * 1000;

export function getAppSession() {
	return openSession<SessionData>({
		name: "maalu_session",
		password: process.env.SESSION_SECRET!,
		maxAge: COOKIE_SECONDS,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		},
	});
}

/** Re-issues the cookie now and then while it is in use, so a device you keep using stays signed in
 * as long as the API's session does. It is a rewrite of the same cookie, not a new sign-in. */
export async function renewSession(session: Awaited<ReturnType<typeof getAppSession>>) {
	if (Date.now() - (session.data.refreshedAt ?? 0) < RENEW_AFTER_MS) return;
	await session.update({ refreshedAt: Date.now() });
}

/** The proof of a right password while the code is still to come. It lives in its own short-lived
 * encrypted cookie, so the browser never holds it and an abandoned sign-in expires by itself. */
export function getChallengeSession() {
	return openSession<{ challenge?: string }>({
		name: "maalu_2fa",
		password: process.env.SESSION_SECRET!,
		maxAge: 5 * 60,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		},
	});
}
