import LoadingIndicator from "./LoadingIndicator";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { EFFECTS_MS, SPRING } from "#/lib/motion";
import { useNavigationPending } from "#/lib/live-search";

/** Shows the loading indicator, on a semi-transparent wash over the results, from the moment a
 * filter or page changes until the new data arrives, so the click is acknowledged straight away.
 * This is the only loading indicator: moving to another page uses it too. */
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
					borderRadius: "var(--shape-xl)",
					// vars, not palette: the palette is always the light scheme, which flashes white in dark mode
					bgcolor: "color-mix(in srgb, var(--mui-palette-background-default) 70%, transparent)",
					opacity: pending ? 1 : 0,
					visibility: pending ? "visible" : "hidden",
					pointerEvents: pending ? "auto" : "none",
					transition: pending
						? `opacity ${SPRING.effects}`
						: `opacity ${SPRING.effects}, visibility 0s linear ${EFFECTS_MS}ms`,
				}}
			>
				<LoadingIndicator contained />
			</Box>
		</Box>
	);
}
