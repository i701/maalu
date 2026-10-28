import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { ReactNode } from "react";

/** One record in the narrow (card) view of a ResponsiveTable. Keep it to the same facts as the
 * desktop row: a title, the key figure on the right, a line of tags/meta, and the actions. */
export default function MobileCard({
	select,
	leading,
	primary,
	secondary,
	end,
	endSecondary,
	meta,
	actions,
}: {
	/** A checkbox at the far left, when the list can be selected. */
	select?: ReactNode;
	/** A shaped icon tile at the left (see ShapeTile), the card's "media". */
	leading?: ReactNode;
	/** Main label (e.g. the vendor name). */
	primary: ReactNode;
	/** Smaller line under it. */
	secondary?: ReactNode;
	/** The key figure, right-aligned (e.g. the amount). */
	end?: ReactNode;
	/** Smaller line under the key figure. */
	endSecondary?: ReactNode;
	/** Chips, dates and other tags, wrapped on one line. */
	meta?: ReactNode;
	/** Icon buttons, right-aligned. */
	actions?: ReactNode;
}) {
	return (
		<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, p: 1.5 }}>
			{select}
			{leading}
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
					<Box sx={{ minWidth: 0 }}>
						{primary}
						{secondary}
					</Box>
					{(end || endSecondary) && (
						<Box sx={{ textAlign: "right", flexShrink: 0 }}>
							{end}
							{endSecondary}
						</Box>
					)}
				</Stack>
				{meta && (
					<Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1 }}>
						{meta}
					</Stack>
				)}
				{actions && (
					<Stack direction="row" sx={{ justifyContent: "flex-end", mt: 0.5, mx: -0.5 }}>
						{actions}
					</Stack>
				)}
			</Box>
		</Box>
	);
}
