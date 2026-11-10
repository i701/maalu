import { describe, expect, it } from "vitest";
import {
	daysFromChoice,
	expiryText,
	permissionLines,
	roleLabel,
	roleOf,
	toggleScope,
} from "./api-keys";
import type { ScopeCatalog } from "#/types/api";

const catalog: ScopeCatalog = {
	areas: [
		{ key: "accounts", label: "Accounts" },
		{ key: "transactions", label: "Transactions" },
		{ key: "budget", label: "Budget" },
	],
	actions: [
		{ key: "read", label: "See it" },
		{ key: "write", label: "Add and change" },
		{ key: "delete", label: "Delete" },
	],
	roles: [
		{
			key: "viewer",
			label: "Viewer",
			description: "",
			scopes: ["accounts:read", "transactions:read", "budget:read"],
		},
		{ key: "reports", label: "Reports only", description: "", scopes: ["budget:read"] },
	],
};

describe("api key helpers", () => {
	it("turns a choice into days, with never as null", () => {
		expect(daysFromChoice("30")).toBe(30);
		expect(daysFromChoice("never")).toBeNull();
	});

	it("says when a key ends, in words", () => {
		const now = new Date("2026-11-10T12:00:00Z").getTime();
		expect(expiryText({ expires_at: null, status: "active" }, now)).toBe("Never expires");
		expect(expiryText({ expires_at: "2026-11-10T18:00:00Z", status: "active" }, now)).toContain(
			"in less than a day",
		);
		expect(expiryText({ expires_at: "2026-11-11T18:00:00Z", status: "active" }, now)).toContain(
			"in 2 days",
		);
		expect(expiryText({ expires_at: "2027-02-08T12:00:00Z", status: "active" }, now)).toContain(
			"in 90 days",
		);
		expect(expiryText({ expires_at: "2026-11-01T12:00:00Z", status: "expired" }, now)).toMatch(
			/^Expired /,
		);
	});

	it("adds and removes one permission, keeping the rest", () => {
		expect(toggleScope(["a:read"], "b:read", true)).toEqual(["a:read", "b:read"]);
		expect(toggleScope(["a:read", "b:read"], "a:read", false)).toEqual(["b:read"]);
		expect(toggleScope(["a:read"], "a:read", true)).toEqual(["a:read"]); // no duplicate
	});

	it("finds the role whose permissions match exactly, otherwise none", () => {
		expect(roleOf(["budget:read"], catalog.roles)?.key).toBe("reports");
		expect(roleOf(["budget:read", "accounts:read"], catalog.roles)).toBeNull();
		expect(roleOf(["transactions:read", "budget:read", "accounts:read"], catalog.roles)?.key).toBe(
			"viewer",
		);
	});

	it("lists what a key may do, area by area", () => {
		expect(
			permissionLines(["accounts:read", "transactions:read", "transactions:write"], catalog),
		).toEqual(["Accounts: see", "Transactions: see, add and change"]);
		expect(permissionLines([], catalog)).toEqual([]);
	});

	it("labels a key by its role, or as custom with a count", () => {
		expect(roleLabel({ role: "viewer", scopes: [] }, catalog)).toBe("Viewer");
		expect(roleLabel({ role: "custom", scopes: ["a:read"] }, catalog)).toBe(
			"Custom (1 permission)",
		);
		expect(roleLabel({ role: "custom", scopes: ["a:read", "b:read"] }, catalog)).toBe(
			"Custom (2 permissions)",
		);
	});
});
