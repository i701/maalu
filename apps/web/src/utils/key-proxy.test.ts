import { describe, expect, it } from "vitest";
import { keyFromAuthorization, upstreamPath } from "./key-proxy";

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
