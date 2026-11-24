import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import { useEffect, useState } from "react";
import { startPwa } from "#/lib/pwa";

/** How often a running app asks the server whether there is a newer version (an installed app can
 * stay open for days). Coming back to the app checks too. */
const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Registers the service worker (production only, so development is never served stale files),
 * listens for the browser's install offer, and, when a new version has been downloaded, asks
 * before switching to it so the app never changes under someone mid-entry.
 */
export default function PwaRegister() {
	const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
	const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

	useEffect(() => {
		startPwa();
		if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return undefined;
		const workers = navigator.serviceWorker;
		let reloading = false;
		let cleaned = false;

		// The new worker took over after "Reload": load the new files once.
		const onController = () => {
			if (reloading) return;
			reloading = true;
			window.location.reload();
		};
		workers.addEventListener("controllerchange", onController);

		workers
			.register("/sw.js", { scope: "/", updateViaCache: "none" })
			.then((reg) => {
				if (cleaned) return; // unmounted before the worker was registered
				setRegistration(reg);
				// a version that finished downloading while the app was closed
				if (reg.waiting && workers.controller) setWaiting(reg.waiting);
			})
			.catch(() => {
				// no service worker (a private window, an old browser): the app works as a website
			});

		return () => {
			cleaned = true;
			workers.removeEventListener("controllerchange", onController);
		};
	}, []);

	// Once registered: watch for a new version, and look for one hourly and on coming back.
	useEffect(() => {
		if (!registration) return undefined;
		const stop = new AbortController(); // ends the listener on each new worker too
		const onUpdateFound = () => {
			const next = registration.installing;
			next?.addEventListener(
				"statechange",
				() => {
					// "installed" with a controller already in charge = an update, not a first visit
					if (next.state === "installed" && navigator.serviceWorker.controller) setWaiting(next);
				},
				{ signal: stop.signal },
			);
		};
		const onVisible = () => {
			if (document.visibilityState === "visible") void registration.update();
		};
		registration.addEventListener("updatefound", onUpdateFound);
		// An update that began between registering and this effect fired no event we heard: watch
		// one still installing, and offer one already waiting (set after this effect, not during it).
		if (registration.installing) onUpdateFound();
		let cleaned = false;
		const late = registration.waiting;
		if (late && navigator.serviceWorker.controller)
			void Promise.resolve().then(() => {
				if (!cleaned) setWaiting(late);
			});
		document.addEventListener("visibilitychange", onVisible);
		const timer = setInterval(() => void registration.update(), CHECK_EVERY_MS);
		return () => {
			cleaned = true;
			stop.abort();
			registration.removeEventListener("updatefound", onUpdateFound);
			document.removeEventListener("visibilitychange", onVisible);
			clearInterval(timer);
		};
	}, [registration]);

	return (
		<Snackbar
			open={waiting !== null}
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			sx={{ bottom: { xs: "calc(96px + env(safe-area-inset-bottom)) !important", md: 24 } }}
		>
			<SnackbarContent
				message="A new version of Maalu is ready."
				action={
					<Button
						size="small"
						color="inherit"
						// a ServiceWorker.postMessage has no targetOrigin (that is for windows)
						// oxlint-disable-next-line unicorn/require-post-message-target-origin
						onClick={() => waiting?.postMessage("SKIP_WAITING")}
						sx={{ fontWeight: 600 }}
					>
						Reload
					</Button>
				}
			/>
		</Snackbar>
	);
}
