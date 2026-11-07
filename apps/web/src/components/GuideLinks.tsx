import { useRouterState } from "@tanstack/react-router";
import { guidesForPath } from "#/lib/docs/for-page";
import { RouterLink } from "./RouterLinks";
import Symbol from "./Symbol";

/** In a page's header: a frosted pill for each guide that explains the page, such as
 * "Guide: Budget and spending limits". Nothing for a page that has none. */
export default function GuideLinks() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	return guidesForPath(pathname).map((doc) => (
		<RouterLink
			key={doc.slug}
			to="/docs/$slug"
			params={{ slug: doc.slug }}
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
			Guide: {doc.title}
		</RouterLink>
	));
}
