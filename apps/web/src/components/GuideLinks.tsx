import { useRouterState } from "@tanstack/react-router";
import { docsSearchFor } from "#/lib/docs/for-page";
import { RouterLink } from "./RouterLinks";
import Symbol from "./Symbol";

/** In a page's header: one "Guides" pill that opens the docs with the search box filled in
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
				bgcolor: "var(--md-sys-color-surface-container-low)",
				color: "var(--md-sys-color-primary)",
				fontSize: 13,
				fontWeight: 500,
				letterSpacing: "0.01em",
				whiteSpace: "nowrap",
				"&:hover": { bgcolor: "var(--md-sys-color-secondary-container)" },
			}}
		>
			<Symbol name="article" size={18} />
			Guides
		</RouterLink>
	);
}
