import useMediaQuery from "@mui/material/useMediaQuery";
import { type MouseEvent, useState } from "react";

/**
 * Compact cards for a phone: a card shows its headline (name, figure, bar) and keeps the rest
 * (chips, notes, buttons) until it is tapped. On a wider screen nothing is hidden.
 *
 * The hiding is pure CSS (`show`), so the page renders the same on the server and in the browser
 * and a phone never flashes the full card; `open` only matters below the `sm` breakpoint. Spread
 * `rootProps` on the card: a tap on the card (anywhere that is not a button or a link) opens or
 * closes it. The keyboard and screen readers use the chevron button (`toggleProps`), which is the
 * real control; the card tap is only a convenience.
 */
export function useCompactCard() {
	const phone = useMediaQuery((theme) => theme.breakpoints.down("sm"));
	const [open, setOpen] = useState(false);
	const toggle = () => setOpen((o) => !o);

	return {
		/** Whether the card is shown in full (only meaningful on a phone). */
		open,
		/** True when opened on a phone, so the card can tint itself like an opened row. */
		opened: phone && open,
		rootProps: {
			onClick: (e: MouseEvent<HTMLElement>) => {
				if (!phone) return;
				if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
				toggle();
			},
		},
		toggleProps: {
			"aria-expanded": open,
			"aria-label": open ? "Hide details" : "Show details",
			onClick: toggle,
		},
		/** The `display` for a part that is hidden on a phone until the card is opened. */
		show: (display: "block" | "flex" | "inline-flex" = "block") =>
			({ xs: open ? display : "none", sm: display }) as const,
	};
}
