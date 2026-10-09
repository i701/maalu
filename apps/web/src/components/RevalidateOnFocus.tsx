import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

const MIN_INTERVAL_MS = 15_000;

/** Refresh the current page's data when the tab becomes visible again (e.g. after editing
 * elsewhere), at most once every 15s. Runs in the background, so the page never blocks. */
export default function RevalidateOnFocus() {
	const router = useRouter();

	useEffect(() => {
		let last = Date.now();
		const revalidate = () => {
			if (document.visibilityState !== "visible" || Date.now() - last < MIN_INTERVAL_MS) return;
			last = Date.now();
			void router.invalidate();
		};
		document.addEventListener("visibilitychange", revalidate);
		window.addEventListener("focus", revalidate);
		return () => {
			document.removeEventListener("visibilitychange", revalidate);
			window.removeEventListener("focus", revalidate);
		};
	}, [router]);

	return null;
}
