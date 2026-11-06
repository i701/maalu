import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { BOTTOM_BAR_HEIGHT, BOTTOM_NAV_ITEMS, inBottomBar, NAV_GROUPS, NAV_ITEMS } from "#/lib/nav";
import NavItem, { NavButton } from "./NavItem";
import SheetHandle from "./SheetHandle";

/**
 * The bottom navigation bar on narrow screens: a flush, full-width tonal band with no border,
 * holding the destinations marked `bottom` in lib/nav.ts and a More button that opens every
 * destination, grouped like the sidebar. Wide screens use the sidebar instead.
 */
export default function BottomNav({ badges = {} }: { badges?: Record<string, number> }) {
	const [open, setOpen] = useState(false);
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	// what is waiting on pages that live behind More, for the badge on the More button
	const behindMore = NAV_ITEMS.filter((i) => !i.bottom).reduce(
		(sum, i) => sum + (badges[i.to] ?? 0),
		0,
	);

	return (
		<Box
			component="nav"
			aria-label="Main"
			sx={{
				// wide screens have the sidebar instead
				display: { xs: "block", md: "none" },
				position: "fixed",
				inset: "auto 0 0 0",
				zIndex: (t) => t.zIndex.appBar,
				height: `calc(${BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
				pt: 1,
				pb: "env(safe-area-inset-bottom)",
				bgcolor: "var(--md-sys-color-surface-container)",
			}}
		>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: `repeat(${BOTTOM_NAV_ITEMS.length + 1}, 1fr)`,
					alignItems: "start",
					maxWidth: 640,
					mx: "auto",
					px: 1,
				}}
			>
				{BOTTOM_NAV_ITEMS.map((item) => (
					<NavItem key={item.to} {...item} badge={badges[item.to]} />
				))}
				<NavButton
					label="More"
					symbol="apps"
					accent="slate"
					badge={behindMore}
					current={!inBottomBar(pathname)}
					expanded={open}
					onClick={() => setOpen(true)}
				/>
			</Box>
			<MoreSheet open={open} onClose={() => setOpen(false)} badges={badges} />
		</Box>
	);
}

/** Every destination, grouped like the sidebar, as a grid of the bottom bar's own items. Picking
 * one goes there and closes the sheet. It slides on MUI's plain curve, which Safari keeps smooth. */
function MoreSheet({
	open,
	onClose,
	badges,
}: {
	open: boolean;
	onClose: () => void;
	badges: Record<string, number>;
}) {
	return (
		<Drawer
			anchor="bottom"
			open={open}
			onClose={onClose}
			slotProps={{
				backdrop: { sx: { backgroundColor: "rgb(0 0 0 / 0.32)" } },
				paper: {
					role: "dialog",
					"aria-label": "All pages",
					sx: {
						maxHeight: "85dvh",
						px: 1.5,
						pt: 1.5,
						pb: "calc(16px + env(safe-area-inset-bottom))",
						width: "min(640px, 100%)",
						mx: "auto",
						borderTopLeftRadius: "var(--shape-xl)",
						borderTopRightRadius: "var(--shape-xl)",
						backgroundColor: "var(--md-sys-color-surface-container-low)",
					},
				},
			}}
		>
			<SheetHandle />
			{NAV_GROUPS.map((group) => {
				const items = NAV_ITEMS.filter((item) => item.group === group.key);
				if (items.length === 0) return null;
				return (
					<Box
						key={group.key}
						component="section"
						aria-labelledby={`more-${group.key}`}
						sx={{ mt: 1.5 }}
					>
						<Typography
							id={`more-${group.key}`}
							component="h2"
							sx={{
								px: 1.5,
								pb: 0.5,
								fontSize: 12,
								fontWeight: 500,
								letterSpacing: "0.06em",
								textTransform: "uppercase",
								color: "var(--md-sys-color-on-surface-variant)",
							}}
						>
							{group.label}
						</Typography>
						<Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: 0.5 }}>
							{items.map((item) => (
								<NavItem key={item.to} {...item} badge={badges[item.to]} onClick={onClose} />
							))}
						</Box>
					</Box>
				);
			})}
		</Drawer>
	);
}
