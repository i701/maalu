import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
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
				sx={(theme) => ({
					position: "absolute",
					inset: 0,
					zIndex: 1,
					display: "flex",
					justifyContent: "center",
					alignItems: "flex-start",
					pt: 12,
					borderRadius: 1,
					bgcolor: alpha(theme.palette.background.default, 0.6),
					opacity: pending ? 1 : 0,
					visibility: pending ? "visible" : "hidden",
					pointerEvents: pending ? "auto" : "none",
					transition: pending
						? `opacity ${DURATION.fade}ms ${EASE_OUT}`
						: `opacity ${DURATION.fade}ms ${EASE_OUT}, visibility 0s linear ${DURATION.fade}ms`,
				})}
			>
				<CircularProgress size={32} />
			</Box>
		</Box>
	);
}
