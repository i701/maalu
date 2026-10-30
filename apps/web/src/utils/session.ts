import { useSession as openSession } from "@tanstack/react-start/server";

export type SessionUser = {
	id: string;
	email: string;
	base_currency: string;
};

// The API's JWT lives only in this encrypted, httpOnly cookie; the browser never sees it.
export type SessionData = {
	token?: string;
	/** Unix seconds, taken from the JWT `exp` claim. */
	expiresAt?: number;
	user?: SessionUser;
};

export function getAppSession(maxAge?: number) {
	return openSession<SessionData>({
		name: "maalu_session",
		password: process.env.SESSION_SECRET!,
		maxAge,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		},
	});
}

/** Read `exp` from a JWT payload without verifying it (the API verifies on every call). */
export function jwtExpiry(token: string): number | undefined {
	try {
		const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
		return typeof payload.exp === "number" ? payload.exp : undefined;
	} catch {
		return undefined;
	}
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
