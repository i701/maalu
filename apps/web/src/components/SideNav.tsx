import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { NAV_GROUPS, NAV_ITEMS, SIDEBAR_WIDTH, TOP_BAR_HEIGHT } from "#/lib/nav";
import Brand from "./Brand";
import SideNavItem from "./SideNavItem";

/**
 * The sidebar on wide screens: the app name, then every destination grouped by what it is for. It
 * sits on the page background, with no border. Narrow screens use the bottom bar instead, so the list
 * here can keep growing.
 */
export default function SideNav() {
	return (
		<Box
			component="nav"
			aria-label="Main"
			sx={{
				display: { xs: "none", md: "flex" },
				flexDirection: "column",
				position: "fixed",
				inset: "0 auto 0 0",
				width: SIDEBAR_WIDTH,
				px: 1.5,
				overflowY: "auto",
				// the page's own background: no dedicated colour, no border
				bgcolor: "background.default",
				zIndex: (t) => t.zIndex.appBar + 1,
			}}
		>
			<Box
				sx={{ height: TOP_BAR_HEIGHT, display: "flex", alignItems: "center", px: 2, flexShrink: 0 }}
			>
				<Brand />
			</Box>
			{NAV_GROUPS.map((group) => {
				const items = NAV_ITEMS.filter((item) => item.group === group.key);
				if (items.length === 0) return null;
				return (
					<Box key={group.key} sx={{ mb: 2 }}>
						<Typography
							component="h2"
							sx={{
								px: 2,
								py: 1,
								fontSize: 12,
								fontWeight: 500,
								letterSpacing: "0.06em",
								textTransform: "uppercase",
								color: "var(--md-sys-color-on-surface-variant)",
							}}
						>
							{group.label}
						</Typography>
						<Box sx={{ display: "grid", gap: 0.5 }}>
							{items.map((item) => (
								<SideNavItem key={item.to} {...item} />
							))}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
