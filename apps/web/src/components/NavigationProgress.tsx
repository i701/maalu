import LinearProgress from "@mui/material/LinearProgress";
import { useRouterState } from "@tanstack/react-router";
import { EFFECTS_MS, SPRING } from "#/lib/motion";

/**
 * A thin bar at the very top while a page is loading. Pages reload *before* they render (so you
 * never see stale data), which would otherwise leave the old page frozen with no sign your click
 * registered. The bar waits 150ms before appearing, so fast loads show nothing at all.
 */
export default function NavigationProgress() {
	const loading = useRouterState({ select: (s) => s.isLoading });

	return (
		<LinearProgress
			aria-label="Loading page"
			aria-hidden={!loading}
			sx={{
				position: "fixed",
				inset: "0 0 auto 0",
				height: 2,
				zIndex: (theme) => theme.zIndex.drawer + 2,
				pointerEvents: "none",
				opacity: loading ? 1 : 0,
				visibility: loading ? "visible" : "hidden",
				// In: wait, then fade. Out: fade immediately, then hide (stops the animation).
				transition: loading
					? `opacity ${SPRING.effects} 150ms, visibility 0s linear 0s`
					: `opacity ${SPRING.effects} 0s, visibility 0s linear ${EFFECTS_MS}ms`,
				"@media (prefers-reduced-motion: reduce)": {
					"& .MuiLinearProgress-bar": { animationDuration: "3s" },
				},
			}}
		/>
	);
}
