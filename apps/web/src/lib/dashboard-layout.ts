import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function parse(raw: string): string[] {
	try {
		const value: unknown = JSON.parse(raw);
		return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
	} catch {
		return [];
	}
}

function subscribe(onChange: () => void) {
	listeners.add(onChange);
	window.addEventListener("storage", onChange);
	return () => {
		listeners.delete(onChange);
		window.removeEventListener("storage", onChange);
	};
}

function useStoredIds(key: string): [string[], (ids: Iterable<string>) => void] {
	// the snapshot is the raw stored string, so it is stable between reads
	const raw = useSyncExternalStore(
		subscribe,
		() => {
			try {
				return localStorage.getItem(key) ?? "[]";
			} catch {
				return "[]";
			}
		},
		() => "[]",
	);
	const save = (ids: Iterable<string>) => {
		try {
			localStorage.setItem(key, JSON.stringify([...ids]));
		} catch {
			// storage blocked: nothing can be remembered, so the sections stay as they are
		}
		for (const listener of listeners) listener();
	};
	return [parse(raw), save];
}

/** The order of the dashboard sections on this device (empty is the default one). Deliberately local,
 * not saved to the account: each app (web, Android, iOS) keeps its own. The server render shows the
 * default, so there is no mismatch. */
export function useSectionOrder() {
	return useStoredIds("maalu.dashboard.order");
}

/** The dashboard sections turned off on this device, local for the same reason. */
export function useHiddenSections(): [ReadonlySet<string>, (ids: Iterable<string>) => void] {
	const [ids, save] = useStoredIds("maalu.dashboard.hidden");
	return [new Set(ids), save];
}
