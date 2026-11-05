import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "#/components/PageHeader";
import { RouterLink } from "#/components/RouterLinks";
import ShapeTile from "#/components/ShapeTile";
import Symbol from "#/components/Symbol";
import { DOCS } from "#/lib/docs";
import { ACCENT } from "#/lib/m3";
import { morph } from "#/lib/shape";

export const Route = createFileRoute("/_protected/docs/")({
	component: DocsIndex,
});

function DocsIndex() {
	return (
		<>
			<PageHeader
				title="Docs"
				symbol="article"
				accent="blue"
				shape={2}
				description="How each part of Maalu works and what it is for."
			/>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
				}}
			>
				{DOCS.map((doc) => (
					<RouterLink
						key={doc.slug}
						to="/docs/$slug"
						params={{ slug: doc.slug }}
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
						<Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
							{doc.summary}
						</Typography>
					</RouterLink>
				))}
			</Box>
		</>
	);
}
