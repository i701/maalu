import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createFileRoute, notFound } from "@tanstack/react-router";
import DocBlocks from "#/components/docs/DocBlocks";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import { RouterButton, RouterLink } from "#/components/RouterLinks";
import { findDoc } from "#/lib/docs";

export const Route = createFileRoute("/_protected/docs/$slug")({
	loader: ({ params }) => {
		const doc = findDoc(params.slug);
		if (!doc) throw notFound();
		return { doc };
	},
	notFoundComponent: () => (
		<EmptyState symbol="article" accent="slate">
			There is no guide with that name. <RouterLink to="/docs">See all the docs</RouterLink>
		</EmptyState>
	),
	component: DocPage,
});

/** Scrolls to a heading on the page, leaving the address alone. */
function jumpTo(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function DocPage() {
	const { doc } = Route.useLoaderData();
	const headings = doc.blocks.flatMap((b) => (b.type === "h2" ? [b] : []));

	return (
		<>
			<PageHeader
				title={doc.title}
				symbol={doc.symbol}
				accent={doc.accent}
				shape={3}
				description={doc.summary}
				action={
					<RouterButton to="/docs" variant="contained">
						All docs
					</RouterButton>
				}
			/>
			<Box
				sx={{
					display: "grid",
					gap: 4,
					gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 220px" },
					alignItems: "start",
				}}
			>
				<Box component="article" sx={{ maxWidth: 760, minWidth: 0 }}>
					<DocBlocks blocks={doc.blocks} />
					{doc.where.length > 0 && (
						<Box sx={{ mt: 5 }}>
							<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>
								Where to find it
							</Typography>
							<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
								{doc.where.map((w) => (
									<RouterButton key={w.to} to={w.to} variant="outlined" size="small">
										{w.label}
									</RouterButton>
								))}
							</Box>
						</Box>
					)}
				</Box>
				<Box
					component="nav"
					aria-label="On this page"
					sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: 88 }}
				>
					<Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.6 }}>
						On this page
					</Typography>
					<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
						{headings.map((h) => (
							<li key={h.id}>
								<Typography
									component="button"
									type="button"
									onClick={() => jumpTo(h.id)}
									sx={{
										all: "unset",
										cursor: "pointer",
										fontSize: 14,
										color: "text.secondary",
										"&:hover, &:focus-visible": { color: "text.primary" },
									}}
								>
									{h.text}
								</Typography>
							</li>
						))}
					</Box>
				</Box>
			</Box>
		</>
	);
}
