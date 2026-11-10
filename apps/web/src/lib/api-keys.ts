import type { ApiKey, ScopeCatalog } from "#/types/api";
import { formatDate } from "./format";

type Role = ScopeCatalog["roles"][number];

/** How long a new or changed key works, as the select offers it. "never" has no end date. */
export const EXPIRY_OPTIONS = [
	{ value: "7", label: "7 days" },
	{ value: "30", label: "30 days" },
	{ value: "90", label: "3 months" },
	{ value: "365", label: "1 year" },
	{ value: "never", label: "Never expires" },
] as const;

/** For a key being edited: leave its end date alone, or choose a new one counted from now. */
export const KEEP_EXPIRY = "keep";

/** How long the old secret keeps working after a rotation. */
export const GRACE_OPTIONS = [
	{ value: "0", label: "Not at all: the old key stops now" },
	{ value: "1", label: "For 1 hour" },
	{ value: "24", label: "For 24 hours" },
	{ value: "168", label: "For 7 days" },
] as const;

/** The days to send for a select value ("never" is null). */
export const daysFromChoice = (value: string): number | null =>
	value === "never" ? null : Number(value);

const DAY_MS = 86_400_000;

/** "Expires 12 Feb 2027 (in 90 days)", "Expired 3 Nov 2026" or "Never expires". */
export function expiryText(key: Pick<ApiKey, "expires_at" | "status">, now = Date.now()): string {
	if (!key.expires_at) return "Never expires";
	if (key.status === "expired") return `Expired ${formatDate(key.expires_at)}`;
	const ms = new Date(key.expires_at).getTime() - now;
	const days = Math.ceil(ms / DAY_MS);
	const left = ms < DAY_MS ? "in less than a day" : `in ${days} ${days === 1 ? "day" : "days"}`;
	return `Expires ${formatDate(key.expires_at)} (${left})`;
}

/** Add or take away one permission, keeping the rest. */
export function toggleScope(scopes: readonly string[], scope: string, on: boolean): string[] {
	const rest = scopes.filter((s) => s !== scope);
	return on ? [...rest, scope] : rest;
}

/** The role whose permissions are exactly `scopes`, or null (the permissions are custom). */
export function roleOf(scopes: readonly string[], roles: readonly Role[]): Role | null {
	const held = new Set(scopes);
	return (
		roles.find((r) => r.scopes.length === held.size && r.scopes.every((s) => held.has(s))) ?? null
	);
}

const ACTION_WORDS: Record<string, string> = {
	read: "see",
	write: "add and change",
	delete: "delete",
};

/** "Transactions: see, add and change" for each area a key has anything in, in the catalogue's
 * order. */
export function permissionLines(scopes: readonly string[], catalog: ScopeCatalog): string[] {
	const lines: string[] = [];
	for (const area of catalog.areas) {
		const actions = catalog.actions
			.filter((a) => scopes.includes(`${area.key}:${a.key}`))
			.map((a) => ACTION_WORDS[a.key] ?? a.key);
		if (actions.length > 0) lines.push(`${area.label}: ${actions.join(", ")}`);
	}
	return lines;
}

/** A short line for the list: the role's name, or how many permissions a custom key has. */
export function roleLabel(key: Pick<ApiKey, "role" | "scopes">, catalog: ScopeCatalog): string {
	const role = catalog.roles.find((r) => r.key === key.role);
	if (role) return role.label;
	return `Custom (${key.scopes.length} ${key.scopes.length === 1 ? "permission" : "permissions"})`;
}
