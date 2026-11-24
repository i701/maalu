import { useSyncExternalStore } from "react";

const KEY = "maalu.dashboard.hidden";
const listeners = new Set<() => void>();

// The ids are kept as the raw stored string so the snapshot is stable between reads.
function read(): string {
	try {
		return localStorage.getItem(KEY) ?? "[]";
	} catch {
		return "[]";
	}
}

function parse(raw: string): string[] {
	try {
		const value: unknown = JSON.parse(raw);
		return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
	} catch {
		return [];
	}
}

function save(ids: Iterable<string>) {
	try {
		localStorage.setItem(KEY, JSON.stringify([...ids]));
	} catch {
		// storage blocked: nothing can be remembered, so the sections stay as they are
	}
	for (const listener of listeners) listener();
}

/** The dashboard sections turned off on this device. Deliberately local, not saved to the account:
 * each app (web, iOS) keeps its own. The server render shows everything, so there is no mismatch. */
export function useHiddenSections(): [ReadonlySet<string>, (ids: Iterable<string>) => void] {
	const raw = useSyncExternalStore(
		(onChange) => {
			listeners.add(onChange);
			window.addEventListener("storage", onChange);
			return () => {
				listeners.delete(onChange);
				window.removeEventListener("storage", onChange);
			};
		},
		read,
		() => "[]",
	);
	return [new Set(parse(raw)), save];
}
