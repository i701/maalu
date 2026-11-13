import Box from "@mui/material/Box";
import ButtonBase, { type ButtonBaseProps } from "@mui/material/ButtonBase";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";
import { ACCENT, type Accent } from "#/lib/m3";
import { MORPH_TRANSITION, morph } from "#/lib/shape";
import { SYMBOL_FILLED } from "#/lib/symbols";
import IconSymbol from "./Symbol";

const Anchor = forwardRef<HTMLAnchorElement, ButtonBaseProps<"a">>(
	(props, ref) => <ButtonBase ref={ref} component="a" focusRipple {...props} />,
);
const SideAnchor = createLink(Anchor);

/**
 * A destination in the sidebar, M3 navigation-drawer style: a full-width pill with the icon and
 * label side by side. Hover tints it with the destination's colour; the current page keeps a
 * stronger tint, a filled icon and a bolder label.
 */
export default function SideNavItem({
	to,
	label,
	symbol,
	accent,
	badge,
}: {
	to: string;
	label: string;
	symbol: string;
	accent: Accent;
	/** A count shown at the end of the row (hidden at zero): things waiting for you */
	badge?: number;
}) {
	return (
		<SideAnchor
			to={to}
			activeProps={{ "aria-current": "page" }}
			sx={{
				display: "flex",
				justifyContent: "flex-start",
				alignItems: "center",
				gap: 1.5,
				width: "100%",
				height: 48,
				px: 2,
				...morph("24px", "md"),
				"--accent": ACCENT[accent],
				color: "var(--md-sys-color-on-surface-variant)",
				fontSize: 14,
				fontWeight: 500,
				letterSpacing: "0.01em",
				transition: `${MORPH_TRANSITION}, background-color var(--spring-effects-default-dur) var(--spring-effects-default), transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)`,
				"&:active": { transform: "scale(.98)" },
				"& .MuiTouchRipple-root .MuiTouchRipple-child": {
					bgcolor: "var(--accent)",
				},
				// Keyboard focus reads like hover (MUI's ripple pulses on top of it).
				"&:focus-visible": {
					bgcolor: "color-mix(in oklab, var(--accent) 12%, transparent)",
					"& .sym": { fontVariationSettings: SYMBOL_FILLED },
				},
				"@media (hover: hover) and (pointer: fine)": {
					"&:hover": {
						bgcolor: "color-mix(in oklab, var(--accent) 12%, transparent)",
						"& .sym": { fontVariationSettings: SYMBOL_FILLED },
					},
				},
				"&[aria-current='page']": {
					color: "var(--accent)",
					fontWeight: 700,
					bgcolor: "color-mix(in oklab, var(--accent) 12%, transparent)",
					"& .sym": {
						fontVariationSettings: SYMBOL_FILLED,
						color:
							"color-mix(in oklab, var(--accent) 85%, var(--md-sys-color-on-surface))",
					},
				},
				"@media (prefers-reduced-motion: reduce)": {
					"&:active": { transform: "none" },
				},
			}}
		>
			<IconSymbol name={symbol} />
			<span>{label}</span>
			{badge ? (
				<Box
					component="span"
					aria-label={`${badge} waiting`}
					sx={{
						ml: "auto",
						minWidth: 22,
						height: 22,
						px: 0.75,
						borderRadius: "11px",
						display: "grid",
						placeItems: "center",
						fontSize: 12,
						fontWeight: 700,
						bgcolor: "var(--md-sys-color-error)",
						color: "var(--md-sys-color-on-error)",
					}}
				>
					{badge > 99 ? "99+" : badge}
				</Box>
			) : null}
		</SideAnchor>
	);
}
