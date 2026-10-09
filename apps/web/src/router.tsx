import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		// Revalidation policy: loader data is reusable for 30s (instant back/forward), but anything
		// stale or invalidated (every mutation invalidates everything) is reloaded *before* the
		// page renders, so you never see old data flash while a refresh is in flight.
		defaultStaleTime: 30_000,
		defaultStaleReloadMode: "blocking",
		defaultErrorComponent: ({ error }) => (
			<Box sx={{ maxWidth: 480, mx: "auto", p: 4 }}>
				<Typography variant="h2" gutterBottom>
					Something went wrong
				</Typography>
				<Alert severity="error">{error instanceof Error ? error.message : String(error)}</Alert>
			</Box>
		),
		defaultNotFoundComponent: () => (
			<Box sx={{ maxWidth: 480, mx: "auto", p: 4, textAlign: "center" }}>
				<Typography variant="h2" gutterBottom>
					Page not found
				</Typography>
				<Button href="/">Go home</Button>
			</Box>
		),
	});
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
