import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { ReactNode } from "react";
import { BOTTOM_BAR_HEIGHT, SIDEBAR_WIDTH, TOP_BAR_HEIGHT } from "#/lib/nav";
import type { SessionUser } from "#/utils/session";
import BottomNav from "./BottomNav";
import NavigationProgress from "./NavigationProgress";
import SideNav from "./SideNav";
import TopBar from "./TopBar";

/**
 * The app frame: a slim top bar, plus a sidebar on wide screens and a bottom navigation bar on
 * narrow ones. Chrome is separated from the page by tone, never by borders.
 */
export default function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			<NavigationProgress />
			<SideNav />
			<TopBar user={user} />
			<BottomNav />

			<Box
				component="main"
				sx={{
					pl: { xs: 2, md: `${SIDEBAR_WIDTH + 24}px` },
					pr: { xs: 2, md: 3 },
					pt: `${TOP_BAR_HEIGHT + 8}px`,
					// leave room for the bottom bar on narrow screens
					pb: {
						xs: `calc(${BOTTOM_BAR_HEIGHT + 16}px + env(safe-area-inset-bottom))`,
						md: 4,
					},
				}}
			>
				{/* Cap and centre page content so it doesn't stretch across ultra-wide monitors. */}
				<Container maxWidth="xl" disableGutters>
					{children}
				</Container>
			</Box>
		</Box>
	);
}
