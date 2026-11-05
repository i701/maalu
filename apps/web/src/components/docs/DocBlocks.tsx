import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { blockKey, inlineSegments, type DocBlock } from "#/lib/docs";
import { RouterLink } from "../RouterLinks";
import Symbol from "../Symbol";

/** Text with `**bold**` shown bold (the names of buttons and settings) and `[label](/page)` shown as
 * a link that stays inside the app. */
function Inline({ text }: { text: string }) {
	return (
		<>
			{inlineSegments(text).map((s) =>
				s.href ? (
					// the address was checked against the real pages when the guide was tested
					<RouterLink key={s.at} to={s.href as never} sx={{ fontWeight: 500 }}>
						{s.text}
					</RouterLink>
				) : s.bold ? (
					<Box component="strong" key={s.at} sx={{ fontWeight: 600 }}>
						{s.text}
					</Box>
				) : (
					<span key={s.at}>{s.text}</span>
				),
			)}
		</>
	);
}

const TONES = {
	tip: { symbol: "lightbulb", accent: "var(--md-sys-color-tertiary)", label: "Tip" },
	note: { symbol: "info", accent: "var(--md-sys-color-primary)", label: "Note" },
	warning: { symbol: "warning", accent: "var(--md-sys-color-error)", label: "Careful" },
} as const;

function Callout({ block }: { block: Extract<DocBlock, { type: "callout" }> }) {
	const tone = TONES[block.tone];
	return (
		<Box
			role="note"
			sx={{
				display: "flex",
				gap: 1.5,
				p: 2,
				borderRadius: "var(--shape-lg)",
				bgcolor: `color-mix(in oklab, ${tone.accent} 12%, var(--md-sys-color-surface-container-low))`,
			}}
		>
			<Symbol
				name={tone.symbol}
				size={22}
				filled
				sx={{ color: tone.accent, flexShrink: 0, mt: 0.25 }}
			/>
			<Box>
				<Typography sx={{ fontWeight: 600, fontSize: 14 }}>{block.title ?? tone.label}</Typography>
				<Typography variant="body2" sx={{ mt: 0.25 }}>
					<Inline text={block.text} />
				</Typography>
			</Box>
		</Box>
	);
}

function Example({ block }: { block: Extract<DocBlock, { type: "example" }> }) {
	return (
		<Box
			sx={{
				p: 2.5,
				borderRadius: "var(--shape-lg)",
				bgcolor: "var(--md-sys-color-surface-container)",
			}}
		>
			<Typography sx={{ fontWeight: 600, mb: 1 }}>{block.title}</Typography>
			<Box component="dl" sx={{ m: 0, display: "grid", gap: 0.75 }}>
				{block.rows.map(([label, value]) => (
					<Box
						key={label}
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1.4fr)" },
							columnGap: 2,
						}}
					>
						<Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
							{label}
						</Typography>
						<Typography
							component="dd"
							variant="body2"
							sx={{ m: 0, fontVariantNumeric: "tabular-nums" }}
						>
							{value}
						</Typography>
					</Box>
				))}
			</Box>
			{block.note && (
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
					<Inline text={block.note} />
				</Typography>
			)}
		</Box>
	);
}

function Steps({ items }: { items: string[] }) {
	return (
		<Box
			component="ol"
			sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.25, counterReset: "step" }}
		>
			{items.map((item, i) => (
				<Box key={item} component="li" sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
					<Box
						aria-hidden
						sx={{
							width: 26,
							height: 26,
							flexShrink: 0,
							borderRadius: "50%",
							display: "grid",
							placeItems: "center",
							fontSize: 13,
							fontWeight: 600,
							bgcolor: "var(--md-sys-color-primary-container)",
							color: "var(--md-sys-color-on-primary-container)",
						}}
					>
						{i + 1}
					</Box>
					<Typography sx={{ pt: 0.25 }}>
						<Inline text={item} />
					</Typography>
				</Box>
			))}
		</Box>
	);
}

/** The body of a guide: each block drawn the same way on every page. */
const DocBlocks = memo(function DocBlocks({ blocks }: { blocks: readonly DocBlock[] }) {
	return (
		<Box sx={{ display: "grid", gap: 2 }}>
			{blocks.map((block, i) => {
				const key = blockKey(block);
				switch (block.type) {
					case "h2":
						return (
							<Typography
								key={block.id}
								id={block.id}
								variant="h2"
								sx={{ fontSize: 22, fontWeight: 600, mt: i === 0 ? 0 : 2, scrollMarginTop: 88 }}
							>
								{block.text}
							</Typography>
						);
					case "p":
						return (
							<Typography key={key}>
								<Inline text={block.text} />
							</Typography>
						);
					case "steps":
						return <Steps key={key} items={block.items} />;
					case "list":
						return (
							<Box key={key} component="ul" sx={{ m: 0, pl: 2.5, display: "grid", gap: 0.75 }}>
								{block.items.map((item) => (
									<Typography key={item} component="li">
										<Inline text={item} />
									</Typography>
								))}
							</Box>
						);
					case "callout":
						return <Callout key={key} block={block} />;
					case "example":
						return <Example key={key} block={block} />;
					case "faq":
						return (
							<Box key={key} sx={{ display: "grid", gap: 2 }}>
								{block.items.map((item) => (
									<Box key={item.q}>
										<Typography sx={{ fontWeight: 600 }}>{item.q}</Typography>
										<Typography variant="body2" sx={{ mt: 0.25 }}>
											<Inline text={item.a} />
										</Typography>
									</Box>
								))}
							</Box>
						);
				}
			})}
		</Box>
	);
});

export default DocBlocks;
