import AutorenewIcon from "@mui/icons-material/Autorenew";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useRouter } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { logoutFn } from "#/server/auth";
import type { SessionUser } from "#/utils/session";
import Brand from "./Brand";
import ColorModeToggle from "./ColorModeToggle";
import { NavLink } from "./RouterLinks";

const DRAWER_WIDTH = 272;

const SECTIONS = [
	{
		label: "Main",
		items: [
			{ to: "/transactions", label: "Transactions", icon: ReceiptLongIcon, color: "primary.main" },
			{
				to: "/subscriptions",
				label: "Subscriptions",
				icon: AutorenewIcon,
				color: "info.main",
			},
			{ to: "/vendors", label: "Vendors", icon: StorefrontIcon, color: "warning.main" },
		],
	},
] as const;

// Full-bleed rows: no rounding, hover spans the whole width, and the active row gets a
// left-edge indicator plus a chevron.
const navItemSx = {
	px: 3.5,
	py: 1.25,
	borderRadius: 0,
	borderLeft: "3px solid transparent",
	"& .nav-chevron": { display: "none", color: "text.secondary" },
	"&.Mui-selected": {
		borderLeftColor: "primary.main",
		bgcolor: "action.selected",
		"& .nav-chevron": { display: "block" },
		"& .MuiListItemText-primary": { fontWeight: 600 },
	},
} as const;

export default function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const router = useRouter();
	// Start expanded on /profile so the active indicator is visible.
	const [accountOpen, setAccountOpen] = useState(
		() => router.state.location.pathname === "/profile",
	);

	async function logout() {
		await logoutFn();
		router.clearCache(); // drop cached page data so the next user never sees it
		await router.navigate({ to: "/login" });
	}

	const drawer = (
		<Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
			<Box sx={{ px: 3.5, py: 2.5 }}>
				<Brand subtitle="Personal finance" />
			</Box>
			<Divider sx={{ mx: 3.5 }} />

			<Box component="nav" sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
				{SECTIONS.map((section) => (
					<List
						key={section.label}
						disablePadding
						subheader={
							<ListSubheader
								disableSticky
								sx={{
									bgcolor: "transparent",
									px: 3.5,
									pt: 3,
									pb: 1,
									lineHeight: 1.5,
									fontSize: 12,
									fontWeight: 600,
									letterSpacing: 0.8,
									textTransform: "uppercase",
								}}
							>
								{section.label}
							</ListSubheader>
						}
					>
						{section.items.map(({ to, label, icon: Icon, color }) => (
							<NavLink
								key={to}
								to={to}
								onClick={() => setMobileOpen(false)}
								activeProps={{ selected: true }}
								sx={navItemSx}
							>
								<ListItemIcon sx={{ minWidth: 40, color }}>
									<Icon />
								</ListItemIcon>
								<ListItemText primary={label} />
								<ChevronRightIcon className="nav-chevron" fontSize="small" />
							</NavLink>
						))}
					</List>
				))}
			</Box>

			<Divider sx={{ mx: 3.5 }} />
			<Collapse in={accountOpen} unmountOnExit id="account-panel">
				<List disablePadding>
					<NavLink
						to="/profile"
						onClick={() => setMobileOpen(false)}
						activeProps={{ selected: true }}
						sx={navItemSx}
					>
						<ListItemIcon sx={{ minWidth: 40, color: "secondary.main" }}>
							<PersonIcon />
						</ListItemIcon>
						<ListItemText primary="Profile" />
						<ChevronRightIcon className="nav-chevron" fontSize="small" />
					</NavLink>
					<ListItemButton onClick={logout} sx={navItemSx}>
						<ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
							<LogoutIcon />
						</ListItemIcon>
						<ListItemText primary="Sign out" />
					</ListItemButton>
				</List>
			</Collapse>
			<ListItemButton
				aria-expanded={accountOpen}
				aria-controls="account-panel"
				onClick={() => setAccountOpen((o) => !o)}
				sx={{ flex: "none", px: 3.5, py: 2, gap: 1.5, borderRadius: 0 }}
			>
				<Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
					{user.email[0].toUpperCase()}
				</Avatar>
				<Box sx={{ minWidth: 0, flexGrow: 1 }}>
					<Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
						{user.email}
					</Typography>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{user.base_currency} account
					</Typography>
				</Box>
				<ExpandLessIcon
					fontSize="small"
					sx={{
						color: "text.secondary",
						transition: "transform 200ms",
						transform: accountOpen ? "rotate(180deg)" : "none",
					}}
				/>
			</ListItemButton>
		</Box>
	);

	return (
		<Box sx={{ display: "flex", minHeight: "100vh" }}>
			<AppBar
				position="fixed"
				sx={{
					width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
					ml: { md: `${DRAWER_WIDTH}px` },
					bgcolor: "background.paper",
					boxShadow: 1,
				}}
			>
				<Toolbar>
					<IconButton
						edge="start"
						aria-label="Open navigation"
						onClick={() => setMobileOpen(true)}
						sx={{ mr: 1, display: { md: "none" } }}
					>
						<MenuIcon />
					</IconButton>
					<Box sx={{ flexGrow: 1 }} />
					<ColorModeToggle />
				</Toolbar>
			</AppBar>

			<Box component="aside" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
				<Drawer
					variant="temporary"
					open={mobileOpen}
					onClose={() => setMobileOpen(false)}
					slotProps={{ root: { keepMounted: true } }} // better open performance on mobile
					sx={{
						display: { xs: "block", md: "none" },
						"& .MuiDrawer-paper": {
							width: DRAWER_WIDTH,
							boxSizing: "border-box",
							height: "100dvh",
							display: "flex",
							flexDirection: "column",
						},
					}}
				>
					{drawer}
				</Drawer>
				<Drawer
					variant="permanent"
					open
					sx={{
						display: { xs: "none", md: "block" },
						"& .MuiDrawer-paper": {
							width: DRAWER_WIDTH,
							boxSizing: "border-box",
							height: "100dvh",
							display: "flex",
							flexDirection: "column",
						},
					}}
				>
					{drawer}
				</Drawer>
			</Box>

			<Box
				component="main"
				sx={{
					flexGrow: 1,
					minWidth: 0,
					p: { xs: 2, md: 3 },
					width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
				}}
			>
				<Toolbar />
				{/* Cap and centre page content so it doesn't stretch across ultra-wide monitors. */}
				<Container maxWidth="xl" disableGutters>
					{children}
				</Container>
			</Box>
		</Box>
	);
}
