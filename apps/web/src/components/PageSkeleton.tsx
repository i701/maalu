import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { keyframes } from "@emotion/react";
import TableCard from "#/components/TableCard";
import { DURATION, EASE_OUT } from "#/lib/motion";

const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;

/** Placeholder for a table page while it loads. It covers the old page, but only after a short
 * delay (the animation waits), so fast navigations show nothing at all. */
export default function PageSkeleton() {
	return (
		<Box
			aria-hidden
			sx={{
				position: "absolute",
				inset: 0,
				zIndex: 1,
				bgcolor: "background.default",
				// Delay, then fade in. `both` keeps it invisible during the delay.
				animation: `${fadeIn} ${DURATION.fade}ms ${EASE_OUT} 150ms both`,
				"@media (prefers-reduced-motion: reduce)": { "& .MuiSkeleton-root": { animation: "none" } },
			}}
		>
			<Skeleton variant="text" sx={{ fontSize: 28, width: 220 }} />
			<Skeleton variant="text" sx={{ width: 320, mb: 3 }} />
			<TableCard>
				<Stack direction="row" spacing={2} sx={{ p: 2 }}>
					<Skeleton variant="rounded" height={40} sx={{ width: { xs: "100%", sm: 280 } }} />
					<Skeleton
						variant="rounded"
						height={40}
						sx={{ width: 120, display: { xs: "none", sm: "block" } }}
					/>
				</Stack>
				{Array.from({ length: 8 }, (_, i) => (
					<Stack
						key={i}
						direction="row"
						spacing={3}
						sx={{ px: 2, py: 2, borderTop: 1, borderColor: "divider", alignItems: "center" }}
					>
						<Skeleton variant="text" sx={{ width: 90 }} />
						<Skeleton variant="text" sx={{ flex: 1 }} />
						<Skeleton variant="text" sx={{ width: 80, display: { xs: "none", sm: "block" } }} />
					</Stack>
				))}
			</TableCard>
		</Box>
	);
}
