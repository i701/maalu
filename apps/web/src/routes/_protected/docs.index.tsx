import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import { RouterLink } from "#/components/RouterLinks";
import SearchField from "#/components/SearchField";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import { DOCS } from "#/lib/docs";
import { searchDocs, type DocHit } from "#/lib/docs/search";
import { ACCENT } from "#/lib/m3";
import { morph } from "#/lib/shape";

const searchSchema = z.object({
	q: z.coerce.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/docs/")({
	validateSearch: searchSchema,
	component: DocsIndex,
});

function DocsIndex() {
	const { q = "" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const hits = useMemo(() => searchDocs(DOCS, q), [q]);

	return (
		<>
			<PageHeader
				title="Docs"
				symbol="article"
				accent="blue"
				shape={2}
				description="How each part of Maalu works and what it is for."
			/>
			<Box sx={{ mb: 2, maxWidth: 480 }}>
				<SearchField
					value={q}
					placeholder="Search the docs"
					onChange={(next) => navigate({ search: { q: next || undefined }, replace: true })}
				/>
			</Box>
			{hits.length === 0 ? (
				<EmptyState symbol="search" accent="slate" shape={3}>
					No guide mentions “{q}”. Try another word, or fewer words.
				</EmptyState>
			) : (
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
					}}
				>
					{hits.map((hit) => (
						<DocCard key={hit.doc.slug} hit={hit} />
					))}
				</Box>
			)}
		</>
	);
}

/** A guide on the index; for a search found in its body, the section and the passage, opening the
 * guide at that section. */
function DocCard({ hit: { doc, section, snippet } }: { hit: DocHit }) {
	return (
		<RouterLink
			to="/docs/$slug"
			params={{ slug: doc.slug }}
			hash={section?.id}
			underline="none"
			color="inherit"
			sx={{
				display: "block",
				p: 2.5,
				...morph("xl"),
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
				<ShapeTile shape={3} size={48} accent={ACCENT[doc.accent]}>
					<Symbol name={doc.symbol} size={24} filled />
				</ShapeTile>
				<Typography sx={{ fontWeight: 600, fontSize: 17 }}>{doc.title}</Typography>
			</Box>
			{snippet ? (
				<>
					{section && (
						<Typography variant="caption" sx={{ display: "block", color: "primary.main", mt: 1.5 }}>
							{section.text}
						</Typography>
					)}
					<Typography variant="body2" sx={{ color: "text.secondary", mt: section ? 0.5 : 1.5 }}>
						{snippet}
					</Typography>
				</>
			) : (
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
					{doc.summary}
				</Typography>
			)}
		</RouterLink>
	);
}
