import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import Symbol from "./Symbol";

/** A frosted pill for stats on a coloured surface (the site's hero chips): 32px, fully round,
 * white at 16%. Use it on a dark gradient. */
export default function GlassPill({ symbol, children }: { symbol?: string; children: ReactNode }) {
	return (
		<Box
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
			}}
		>
			{symbol && <Symbol name={symbol} size={18} />}
			{children}
		</Box>
	);
}
