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

	useEffect(() => {
		startPwa();
		if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

		let timer: ReturnType<typeof setInterval> | undefined;
		let reloading = false;
		const onVisible = () => {
			if (document.visibilityState === "visible") void registration?.update();
		};
		let registration: ServiceWorkerRegistration | undefined;

		// The new worker took over after "Reload": load the new files once.
		const onController = () => {
			if (reloading) return;
			reloading = true;
			window.location.reload();
		};
		navigator.serviceWorker.addEventListener("controllerchange", onController);

		navigator.serviceWorker
			.register("/sw.js", { scope: "/", updateViaCache: "none" })
			.then((reg) => {
				registration = reg;
				// a version that finished downloading while the app was closed
				if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
				reg.addEventListener("updatefound", () => {
					const next = reg.installing;
					next?.addEventListener("statechange", () => {
						// "installed" with a controller already in charge = an update, not a first visit
						if (next.state === "installed" && navigator.serviceWorker.controller) setWaiting(next);
					});
				});
				timer = setInterval(() => void reg.update(), CHECK_EVERY_MS);
				document.addEventListener("visibilitychange", onVisible);
			})
			.catch(() => {
				// no service worker (a private window, an old browser): the app works as a website
			});

		return () => {
			navigator.serviceWorker.removeEventListener("controllerchange", onController);
			document.removeEventListener("visibilitychange", onVisible);
			if (timer) clearInterval(timer);
		};
	}, []);

	return (
		<Snackbar
			open={waiting !== null}
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			sx={{ bottom: { xs: "calc(96px + env(safe-area-inset-bottom)) !important", sm: 24 } }}
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
