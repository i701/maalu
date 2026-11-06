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
			{ name: "theme-color", content: "#1976d2" },
		],
		links: [
			// The logo (public/): an SVG that follows the browser's light or dark mode, the .ico for
			// browsers without SVG icons, the home-screen icon for iPhones, and the manifest for Android.
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
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
