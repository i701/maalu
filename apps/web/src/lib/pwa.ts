import { useSyncExternalStore } from "react";

/**
 * Install state for the app as a PWA, kept outside React because the browser fires
 * `beforeinstallprompt` once, early, and the Settings card that offers it may open much later.
 * `startPwa` (called once from the root) attaches the listeners; `useInstall` reads the result.
 */

/** The non-standard event Chromium browsers fire when the app can be installed. */
type InstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
	return "prompt" in event && typeof event.prompt === "function";
}

export type InstallState = {
	/** Running as an installed app right now (a window of its own, no browser bar). */
	standalone: boolean;
	/** The browser has offered to install it and `install()` will show its prompt. */
	canPrompt: boolean;
	/** An iPhone or iPad, where there is no prompt: it is Share, then Add to Home Screen. */
	ios: boolean;
};

const SERVER: InstallState = { standalone: false, canPrompt: false, ios: false };

let deferred: InstallPromptEvent | null = null;
let installedNow = false;
let state: InstallState = SERVER;
const listeners = new Set<() => void>();
let started = false;

const isStandalone = () =>
	window.matchMedia("(display-mode: standalone)").matches ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => {
	const userAgent = navigator.userAgent;

	// Standard iPhone, iPad, and iPod detection
	if (/iPhone|iPad|iPod/i.test(userAgent)) {
		return true;
	}

	// iPadOS 13+ reports itself as a Mac, but has a multi-touch screen
	return /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
};

function publish() {
	state = {
		standalone: installedNow || isStandalone(),
		canPrompt: deferred !== null,
		ios: isIos(),
	};
	for (const l of listeners) l();
}

/** Listen for the browser's install offer. Safe to call twice. */
export function startPwa() {
	if (started || typeof window === "undefined") return;
	started = true;
	window.addEventListener("beforeinstallprompt", (e) => {
		if (!isInstallPromptEvent(e)) return;
		e.preventDefault(); // keep it, so Settings can offer it at a calm moment
		deferred = e;
		publish();
	});
	window.addEventListener("appinstalled", () => {
		deferred = null;
		installedNow = true;
		publish();
	});
	window.matchMedia("(display-mode: standalone)").addEventListener("change", publish);
	publish();
}

/** Show the browser's own install prompt. Resolves to whether the person accepted. */
export async function install(): Promise<boolean> {
	if (!deferred) return false;
	await deferred.prompt();
	const { outcome } = await deferred.userChoice;
	deferred = null; // an offer can be used once
	publish();
	return outcome === "accepted";
}

const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

export const useInstall = (): InstallState =>
	useSyncExternalStore(
		subscribe,
		() => state,
		() => SERVER,
	);
