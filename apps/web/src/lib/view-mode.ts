import { useSyncExternalStore } from "react";

export type ViewMode = "cards" | "table";
const KEY = "maalu:view-mode";
const listeners = new Set<() => void>();

function read(): ViewMode {
	try {
		return localStorage.getItem(KEY) === "table" ? "table" : "cards";
	} catch {
		return "cards"; // storage blocked (private window): fall back, never throw
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setViewMode(mode: ViewMode) {
	try {
		localStorage.setItem(KEY, mode);
	} catch {
		// not persisted, still applied for this session below
	}
	for (const l of listeners) l();
}

/** How lists are shown: a grid of cards (default) or the classic table. Remembered per browser.
 * Server and first client render both use "cards", so there is no hydration mismatch. */
export function useViewMode(): ViewMode {
	return useSyncExternalStore(subscribe, read, () => "cards");
}
