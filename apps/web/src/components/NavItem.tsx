import ButtonBase, { type ButtonBaseProps } from "@mui/material/ButtonBase";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";
import { ACCENT, type Accent } from "#/lib/m3";
import { MORPH_TRANSITION } from "#/lib/shape";
import { SYMBOL_FILLED } from "#/lib/symbols";
import Symbol from "./Symbol";

const Anchor = forwardRef<HTMLAnchorElement, ButtonBaseProps<"a">>((props, ref) => (
	<ButtonBase ref={ref} component="a" focusRipple {...props} />
));
const NavAnchor = createLink(Anchor);

/**
 * A navigation destination, M3 style: an icon on a 56x32 pill with a label underneath. Hover grows
 * the pill from the centre on a spatial spring and fills the icon; the current page keeps the full
 * pill in the secondary container, a filled icon and a bolder label. Used by the desktop rail and
 * the mobile bottom bar.
 */
export default function NavItem({
	to,
	label,
	symbol,
	accent,
	onClick,
}: {
	to: string;
	label: string;
	symbol: string;
	accent: Accent;
	onClick?: () => void;
}) {
	return (
		<NavAnchor
			centerRipple
			to={to}
			onClick={onClick}
			activeProps={{ "aria-current": "page" }}
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: "4px",
				width: "100%",
				height: 64,
				px: 0.5,
				// each destination has its own colour, used for its pill and icon when active
				"--accent": ACCENT[accent],
				color: "var(--md-sys-color-on-surface-variant)",
				"& .nav-pill": {
					position: "relative",
					isolation: "isolate",
					display: "grid",
					placeItems: "center",
					width: 56,
					height: 32,
					borderRadius: "var(--shape-lg)",
					transition: `${MORPH_TRANSITION}, transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)`,
				},
				"& .nav-pill::before": {
					content: '""',
					position: "absolute",
					inset: 0,
					zIndex: -1,
					borderRadius: "inherit",
					bgcolor:
						"color-mix(in oklab, var(--accent) 26%, var(--md-sys-color-surface-container-high))",
					opacity: 0,
					transform: "scaleX(.3)",
					transition:
						"transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast), opacity .12s linear",
				},
				"& .nav-label": {
					fontSize: 12,
					lineHeight: "16px",
					fontWeight: 500,
					letterSpacing: "0.03em",
					maxWidth: "100%",
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				},
				"&:active .nav-pill": { transform: "scale(.94)" },
				"@media (hover: hover) and (pointer: fine)": {
					// the shape morph (lib/shape.ts), on the pill rather than the whole tap target
					"&:hover .nav-pill": { borderRadius: "var(--shape-sm)" },
					"&:hover .nav-pill::before": { opacity: 0.5, transform: "scaleX(.8)" },
					"&:hover .sym": { fontVariationSettings: SYMBOL_FILLED },
				},
				"&[aria-current='page']": {
					color: "var(--md-sys-color-on-surface)",
					"& .nav-pill": {
						color: "color-mix(in oklab, var(--accent) 85%, var(--md-sys-color-on-surface))",
					},
					"& .nav-pill::before, &:hover .nav-pill::before": { opacity: 1, transform: "none" },
					"& .sym": { fontVariationSettings: SYMBOL_FILLED },
					"& .nav-label": { fontWeight: 700 },
				},
				// Keyboard focus reads like hover: the pill grows and the icon fills, while MUI's ripple pulses.
				"&:focus-visible .nav-pill": { borderRadius: "var(--shape-sm)" },
				"&:focus-visible .nav-pill::before": { opacity: 0.5, transform: "scaleX(.8)" },
				"&:focus-visible .sym": { fontVariationSettings: SYMBOL_FILLED },
				// The ripple belongs on the pill, not the whole 96x64 target, in the destination's colour.
				"& .MuiTouchRipple-root": {
					inset: "auto",
					top: 6,
					left: "50%",
					width: 56,
					height: 32,
					ml: "-28px",
					borderRadius: "var(--shape-lg)",
				},
				"& .MuiTouchRipple-root .MuiTouchRipple-child": { bgcolor: "var(--accent)" },
			}}
		>
			<span className="nav-pill">
				<Symbol name={symbol} />
			</span>
			<span className="nav-label">{label}</span>
		</NavAnchor>
	);
}
