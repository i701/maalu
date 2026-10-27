import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { logoutFn } from "#/server/auth";
import type { SessionUser } from "#/utils/session";
import Symbol from "./Symbol";

/** The signed-in user's avatar; opens a menu with the profile page and sign out. */
export default function UserMenu({ user }: { user: SessionUser }) {
	const router = useRouter();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	async function logout() {
		setAnchor(null);
		await logoutFn();
		router.clearCache(); // drop cached page data so the next user never sees it
		await router.navigate({ to: "/login" });
	}

	return (
		<>
			<ButtonBase
				aria-label="Account menu"
				aria-haspopup="menu"
				aria-expanded={Boolean(anchor)}
				onClick={(e) => setAnchor(e.currentTarget)}
				sx={{ borderRadius: "var(--shape-full)" }}
			>
				<Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
					{user.email[0].toUpperCase()}
				</Avatar>
			</ButtonBase>
			<Menu
				anchorEl={anchor}
				open={Boolean(anchor)}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
			>
				<Box sx={{ px: 2, py: 1.5 }}>
					<Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
						{user.email}
					</Typography>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{user.base_currency} account
					</Typography>
				</Box>
				<MenuItem
					onClick={() => {
						setAnchor(null);
						void router.navigate({ to: "/profile" });
					}}
					sx={{ gap: 1.5 }}
				>
					<Symbol name="person" size={22} />
					Profile
				</MenuItem>
				<MenuItem onClick={logout} sx={{ gap: 1.5 }}>
					<Symbol name="logout" size={22} />
					Sign out
				</MenuItem>
			</Menu>
		</>
	);
}
