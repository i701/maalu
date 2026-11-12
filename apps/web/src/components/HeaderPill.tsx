import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import Symbol from "./Symbol";

/** A quiet stat pill under a page's title ("324 transactions"): 32px, white on the grey page. */
export default function HeaderPill({ symbol, children }: { symbol?: string; children: ReactNode }) {
	return (
		<Box
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.75,
				height: 32,
				px: 1.5,
				borderRadius: "var(--shape-full)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
				color: "var(--md-sys-color-on-surface-variant)",
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
