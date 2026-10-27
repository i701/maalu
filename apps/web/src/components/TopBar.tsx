import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { TOP_BAR_HEIGHT } from "#/lib/nav";
import type { SessionUser } from "#/utils/session";
import Brand from "./Brand";
import ColorModeToggle from "./ColorModeToggle";
import UserMenu from "./UserMenu";

/** The top bar: the logo and name on the left, colour mode and account on the right. Tonal, with
 * no border. */
export default function TopBar({ user }: { user: SessionUser }) {
	return (
		<Box
			component="header"
			sx={{
				position: "fixed",
				inset: "0 0 auto 0",
				height: TOP_BAR_HEIGHT,
				px: { xs: 2, md: 3 },
				bgcolor: "background.default",
				zIndex: (t) => t.zIndex.appBar,
			}}
		>
			{/* Same cap and gutters as the page content in AppShell, so the bar lines up with it. */}
			<Container
				maxWidth="xl"
				disableGutters
				sx={{
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Brand />
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<ColorModeToggle />
					<UserMenu user={user} />
				</Box>
			</Container>
		</Box>
	);
}
