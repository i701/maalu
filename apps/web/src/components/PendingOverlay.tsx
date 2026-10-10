import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT } from "#/lib/motion";
import { useNavigationPending } from "#/lib/live-search";

/** Dims the results and shows a spinner from the moment a filter or page changes until the new
 * data arrives, so the click is acknowledged straight away. The content underneath stays put. */
export default function PendingOverlay({ children }: { children: ReactNode }) {
	const pending = useNavigationPending();

	return (
		<Box sx={{ position: "relative" }} aria-busy={pending}>
			{children}
			<Box
				aria-hidden
				sx={{
					position: "absolute",
					inset: 0,
					zIndex: 1,
					display: "flex",
					justifyContent: "center",
					alignItems: "flex-start",
					pt: 12,
					borderRadius: 1,
					// vars, not palette: the palette is always the light scheme, which flashes white in dark mode
					bgcolor: "color-mix(in srgb, var(--mui-palette-background-default) 60%, transparent)",
					opacity: pending ? 1 : 0,
					visibility: pending ? "visible" : "hidden",
					pointerEvents: pending ? "auto" : "none",
					transition: pending
						? `opacity ${DURATION.fade}ms ${EASE_OUT}`
						: `opacity ${DURATION.fade}ms ${EASE_OUT}, visibility 0s linear ${DURATION.fade}ms`,
				}}
			>
				<CircularProgress size={32} />
			</Box>
		</Box>
	);
}
