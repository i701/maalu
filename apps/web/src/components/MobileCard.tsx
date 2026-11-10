import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { useViewMode } from "#/lib/view-mode";

/** One record in the narrow (card) view of a ResponsiveTable. Keep it to the same facts as the
 * desktop row: a title, the key figure on the right, a line of tags/meta, and the actions.
 * In the Table view the row is compact: the title and the key figure only, and the tags/meta and
 * the actions show when the row is tapped (the cards view always shows everything). */
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
	const collapsible = useViewMode() === "table" && Boolean(meta || actions);
	const [open, setOpen] = useState(false);
	const showMore = !collapsible || open;
	const toggle = collapsible ? () => setOpen((o) => !o) : undefined;
	const onKey = (e: KeyboardEvent<HTMLElement>) => {
		if (toggle && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault();
			toggle();
		}
	};
	return (
		<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, px: 1.5, py: collapsible ? 1 : 1.5 }}>
			{select}
			{leading}
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Stack
					direction="row"
					spacing={2}
					onClick={toggle}
					onKeyDown={onKey}
					role={toggle && "button"}
					tabIndex={toggle && 0}
					aria-expanded={toggle && open}
					sx={{ justifyContent: "space-between", cursor: toggle && "pointer" }}
				>
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
				{showMore && meta && (
					<Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1 }}>
						{meta}
					</Stack>
				)}
				{showMore && actions && (
					<Stack direction="row" sx={{ justifyContent: "flex-end", mt: 0.5, mx: -0.5 }}>
						{actions}
					</Stack>
				)}
			</Box>
		</Box>
	);
}
