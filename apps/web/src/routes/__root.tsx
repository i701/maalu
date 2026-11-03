import robotoCss from "@fontsource-variable/roboto/index.css?url";
import leafletCss from "leaflet/dist/leaflet.css?url";
import m3Css from "#/styles/m3.css?url";
import mapCss from "#/styles/map.css?url";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import Providers from "#/components/Providers";
import ReactScan from "#/components/ReactScan";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Maalu" },
		],
		links: [
			{ rel: "stylesheet", href: robotoCss },
			{ rel: "stylesheet", href: m3Css },
			{ rel: "stylesheet", href: leafletCss },
			{ rel: "stylesheet", href: mapCss },
		],
	}),
	component: () => (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{/* Sets the colour scheme before first paint so there is no light/dark flash. */}
				<InitColorSchemeScript attribute="data" defaultMode="system" />
				<Providers>
					<Outlet />
				</Providers>
				<ReactScan />
				<Scripts />
			</body>
		</html>
	),
});
