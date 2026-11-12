import { describe, expect, it } from "vitest";
import {
	credentialFromAuthorization,
	isOpenRoute,
	keyFromAuthorization,
	upstreamPath,
} from "./key-proxy";

describe("keyFromAuthorization", () => {
	it("takes an API key sent as a bearer token", () => {
		expect(keyFromAuthorization("Bearer mlk_AbC123-_x")).toBe("mlk_AbC123-_x");
		expect(keyFromAuthorization("  Bearer mlk_abc  ")).toBe("mlk_abc");
	});

	it("refuses anything else, above all a session token", () => {
		expect(keyFromAuthorization(null)).toBeNull();
		expect(keyFromAuthorization("")).toBeNull();
		expect(keyFromAuthorization("Bearer SOME-SESSION-TOKEN")).toBeNull();
		expect(keyFromAuthorization("Basic bWxrX2Fi")).toBeNull();
		expect(keyFromAuthorization("bearer mlk_abc")).toBeNull();
		expect(keyFromAuthorization("Bearer mlk_abc def")).toBeNull();
	});
});

describe("upstreamPath", () => {
	it("accepts a plain path", () => {
		expect(upstreamPath("accounts")).toBe("accounts");
		expect(upstreamPath("transactions/3f2a/links")).toBe("transactions/3f2a/links");
		expect(upstreamPath("/stats/available-to-spend")).toBe("stats/available-to-spend");
	});

	it("refuses an empty path and one that climbs out", () => {
		expect(upstreamPath(undefined)).toBeNull();
		expect(upstreamPath("")).toBeNull();
		expect(upstreamPath("../auth/login")).toBeNull();
		expect(upstreamPath("accounts/../../auth")).toBeNull();
		expect(upstreamPath("accounts/%2e%2e/auth")).toBeNull();
		expect(upstreamPath("accounts/./x")).toBeNull();
	});

	it("refuses odd characters and absurd lengths", () => {
		expect(upstreamPath("accounts?x=1")).toBeNull(); // the query string is passed separately
		expect(upstreamPath("a b")).toBeNull();
		expect(upstreamPath("a".repeat(301))).toBeNull();
		expect(upstreamPath("accounts\\x")).toBeNull();
	});
});

// What the API makes with secrets.token_urlsafe(32): 43 URL-safe characters.
const SESSION = "Zs4Qf0aV2uYxkq3nT8mHc7LrPbN1eGd6WjXvAoUiK-_";

describe("credentialFromAuthorization", () => {
	it("tells an API key from a session token", () => {
		expect(credentialFromAuthorization("Bearer mlk_AbC123-_x")).toEqual({
			kind: "key",
			token: "mlk_AbC123-_x",
		});
		expect(credentialFromAuthorization(`Bearer ${SESSION}`)).toEqual({
			kind: "session",
			token: SESSION,
		});
		expect(credentialFromAuthorization(`  Bearer ${SESSION}  `)).toEqual({
			kind: "session",
			token: SESSION,
		});
	});

	it("refuses a missing header, another scheme and tokens of the wrong shape", () => {
		expect(credentialFromAuthorization(null)).toBeNull();
		expect(credentialFromAuthorization("")).toBeNull();
		expect(credentialFromAuthorization(`Basic ${SESSION}`)).toBeNull();
		expect(credentialFromAuthorization(`bearer ${SESSION}`)).toBeNull();
		expect(credentialFromAuthorization("Bearer short")).toBeNull();
		expect(credentialFromAuthorization(`Bearer ${SESSION}x`)).toBeNull(); // 44 characters
		expect(credentialFromAuthorization(`Bearer ${SESSION.slice(0, 42)}!`)).toBeNull();
		expect(credentialFromAuthorization(`Bearer ${SESSION} extra`)).toBeNull();
	});

	it("never mistakes a key for a session token or the other way round", () => {
		expect(credentialFromAuthorization("Bearer mlk_" + "a".repeat(32))?.kind).toBe("key");
		expect(credentialFromAuthorization(`Bearer ${"a".repeat(43)}`)?.kind).toBe("session");
	});
});

describe("isOpenRoute", () => {
	it("lets a person sign in without a credential, and only that", () => {
		expect(isOpenRoute("POST", "auth/login")).toBe(true);
		expect(isOpenRoute("post", "auth/login/2fa")).toBe(true);
		expect(isOpenRoute("GET", "server")).toBe(true);
		expect(isOpenRoute("POST", "server")).toBe(false);
		expect(isOpenRoute("GET", "server/extra")).toBe(false);
		expect(isOpenRoute("GET", "auth/login")).toBe(false);
		expect(isOpenRoute("POST", "auth/register")).toBe(false);
		expect(isOpenRoute("POST", "auth/password")).toBe(false);
		expect(isOpenRoute("POST", "auth/logout")).toBe(false);
		expect(isOpenRoute("POST", "auth/login/")).toBe(false);
		expect(isOpenRoute("POST", "auth/login/2fa/extra")).toBe(false);
		expect(isOpenRoute("GET", "accounts")).toBe(false);
	});
});
