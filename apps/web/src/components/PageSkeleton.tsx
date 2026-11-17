import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

const BONE = {
	bgcolor: "var(--md-sys-color-surface-container-high)",
	"@media (prefers-reduced-motion: reduce)": { "&::after": { animation: "none" } },
} as const;

/** What a slow page shows while its data loads (a route's `pendingComponent`): the shape of the
 * page, a header, a row of tiles and two cards, so nothing jumps when the real page arrives. */
export default function PageSkeleton() {
	return (
		<Box role="status" aria-label="Loading" sx={{ display: "grid", gap: 3 }}>
			<Skeleton variant="rounded" animation="wave" width={240} height={40} sx={BONE} />
			<Box
				sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}
			>
				{[0, 1, 2].map((i) => (
					<Skeleton
						key={i}
						variant="rounded"
						animation="wave"
						height={96}
						sx={{ ...BONE, borderRadius: "var(--shape-xl)" }}
					/>
				))}
			</Box>
			<Skeleton
				variant="rounded"
				animation="wave"
				height={320}
				sx={{ ...BONE, borderRadius: "var(--shape-xl)" }}
			/>
			<Skeleton
				variant="rounded"
				animation="wave"
				height={220}
				sx={{ ...BONE, borderRadius: "var(--shape-xl)" }}
			/>
		</Box>
	);
}
