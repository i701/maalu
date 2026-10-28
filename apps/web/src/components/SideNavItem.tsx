import ButtonBase, { type ButtonBaseProps } from "@mui/material/ButtonBase";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";
import { ACCENT, type Accent } from "#/lib/m3";
import { SYMBOL_FILLED } from "#/lib/symbols";
import Symbol from "./Symbol";

const Anchor = forwardRef<HTMLAnchorElement, ButtonBaseProps<"a">>((props, ref) => (
	<ButtonBase ref={ref} component="a" {...props} />
));
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
}: {
	to: string;
	label: string;
	symbol: string;
	accent: Accent;
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
				borderRadius: "var(--shape-full)",
				"--accent": ACCENT[accent],
				color: "var(--md-sys-color-on-surface-variant)",
				fontSize: 14,
				fontWeight: 500,
				letterSpacing: "0.01em",
				transition:
					"background-color var(--spring-effects-default-dur) var(--spring-effects-default), transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)",
				"&:active": { transform: "scale(.98)" },
				"@media (hover: hover) and (pointer: fine)": {
					"&:hover": {
						bgcolor: "color-mix(in oklab, var(--accent) 12%, transparent)",
						"& .sym": { fontVariationSettings: SYMBOL_FILLED },
					},
				},
				"&[aria-current='page']": {
					color: "var(--md-sys-color-on-surface)",
					fontWeight: 700,
					bgcolor:
						"color-mix(in oklab, var(--accent) 26%, var(--md-sys-color-surface-container-high))",
					"& .sym": {
						fontVariationSettings: SYMBOL_FILLED,
						color: "color-mix(in oklab, var(--accent) 85%, var(--md-sys-color-on-surface))",
					},
				},
				"@media (prefers-reduced-motion: reduce)": { "&:active": { transform: "none" } },
			}}
		>
			<Symbol name={symbol} />
			<span>{label}</span>
		</SideAnchor>
	);
}
