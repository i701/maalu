import Box from "@mui/material/Box";
import { BOTTOM_BAR_HEIGHT, BOTTOM_NAV_ITEMS } from "#/lib/nav";
import NavItem from "./NavItem";

/**
 * The bottom navigation bar on narrow screens: a flush, full-width tonal band with no border,
 * holding only the destinations marked `bottom` in lib/nav.ts. Wide screens use the sidebar.
 */
export default function BottomNav() {
	return (
		<Box
			component="nav"
			aria-label="Main"
			sx={{
				// wide screens have the sidebar instead
				display: { xs: "block", md: "none" },
				position: "fixed",
				inset: "auto 0 0 0",
				zIndex: (t) => t.zIndex.appBar,
				height: `calc(${BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
				pt: 1,
				pb: "env(safe-area-inset-bottom)",
				bgcolor: "var(--md-sys-color-surface-container)",
			}}
		>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: `repeat(${BOTTOM_NAV_ITEMS.length}, 1fr)`,
					alignItems: "start",
					maxWidth: 640,
					mx: "auto",
					px: 1,
				}}
			>
				{BOTTOM_NAV_ITEMS.map((item) => (
					<NavItem key={item.to} {...item} />
				))}
			</Box>
		</Box>
	);
}
