import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { ReactNode } from "react";
import { BOTTOM_BAR_HEIGHT, TOP_BAR_HEIGHT } from "#/lib/nav";
import type { SessionUser } from "#/utils/session";
import BottomNav from "./BottomNav";
import NavigationProgress from "./NavigationProgress";
import TopBar from "./TopBar";

/**
 * The app frame: a slim top bar and a bottom navigation bar on every screen
 * size. Chrome is separated from the page by tone, never by borders.
 */
export default function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			<NavigationProgress />
			<TopBar user={user} />
			<BottomNav />

			<Box
				component="main"
				sx={{
					px: { xs: 2, md: 3 },
					pt: `${TOP_BAR_HEIGHT + 8}px`,
					// leave room for the bottom bar
					pb: `calc(${BOTTOM_BAR_HEIGHT + 16}px + env(safe-area-inset-bottom))`,
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
