import { useRouterState } from "@tanstack/react-router";
import { docsSearchFor } from "#/lib/docs/for-page";
import { RouterLink } from "./RouterLinks";
import Symbol from "./Symbol";

/** In a page's header: one frosted "Guides" pill that opens the docs with the search box filled in
 * for this page, listing what explains it. One link however many guides there are (so the banner does not grow with the docs), and
 * the docs page lists them. Nothing for a page that has none. */
export default function GuideLinks() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const term = docsSearchFor(pathname);
	if (!term) return null;
	return (
		<RouterLink
			to="/docs"
			search={{ q: term }}
			underline="none"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.75,
				height: 32,
				px: 1.5,
				borderRadius: "var(--shape-full)",
				bgcolor: "rgb(255 255 255 / 0.16)",
				color: "#fff",
				fontSize: 13,
				fontWeight: 500,
				letterSpacing: "0.01em",
				whiteSpace: "nowrap",
				"&:hover": { bgcolor: "rgb(255 255 255 / 0.28)", color: "#fff" },
				"&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
			}}
		>
			<Symbol name="article" size={18} />
			Guides
		</RouterLink>
	);
}
