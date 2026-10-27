import Box from "@mui/material/Box";
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
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				height: TOP_BAR_HEIGHT,
				px: { xs: 2, md: 3 },
				bgcolor: "background.default",
				zIndex: (t) => t.zIndex.appBar,
			}}
		>
			<Brand />
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
				<ColorModeToggle />
				<UserMenu user={user} />
			</Box>
		</Box>
	);
}
