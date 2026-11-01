import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNoneOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAction } from "#/lib/use-action";
import { badgeText } from "#/lib/notifications";
import {
	listRecentNotificationsFn,
	markAllNotificationsReadFn,
	markNotificationReadFn,
} from "#/server/notifications";
import type { AppNotification } from "#/types/api";
import NotificationItem from "./NotificationItem";

/** The bell in the top bar: a badge with how many are unread, and a popover with the newest.
 * Clicking one marks it read and opens the page it is about. */
export default function NotificationBell({ unread }: { unread: number }) {
	const router = useRouter();
	const { run } = useAction();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [items, setItems] = useState<AppNotification[] | null>(null);

	async function open(el: HTMLElement) {
		setAnchor(el);
		const res = await listRecentNotificationsFn();
		setItems(res.ok ? res.data : []);
	}

	async function choose(n: AppNotification) {
		setAnchor(null);
		if (!n.read_at) await run(() => markNotificationReadFn({ data: { id: n.id } }));
		if (n.link) router.history.push(n.link);
	}

	async function readAll() {
		if (await run(() => markAllNotificationsReadFn())) {
			setItems((current) => current?.map((n) => ({ ...n, read_at: n.read_at ?? "now" })) ?? null);
		}
	}

	return (
		<>
			<IconButton
				aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
				aria-haspopup="dialog"
				onClick={(e) => void open(e.currentTarget)}
			>
				<Badge
					color="error"
					badgeContent={unread > 0 ? badgeText(unread) : 0}
					invisible={unread === 0}
				>
					<NotificationsNoneIcon />
				</Badge>
			</IconButton>
			<Popover
				open={Boolean(anchor)}
				anchorEl={anchor}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				slotProps={{ paper: { sx: { width: 380, maxWidth: "calc(100vw - 24px)", mt: 1 } } }}
			>
				<Stack
					direction="row"
					sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}
				>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Notifications
					</Typography>
					<Button
						size="small"
						startIcon={<DoneAllIcon />}
						disabled={unread === 0}
						onClick={readAll}
					>
						Mark all read
					</Button>
				</Stack>
				<Box sx={{ maxHeight: 420, overflowY: "auto" }}>
					{items === null && (
						<Typography sx={{ px: 2, py: 3, color: "text.secondary" }}>Loading…</Typography>
					)}
					{items?.length === 0 && (
						<Typography sx={{ px: 2, py: 3, color: "text.secondary" }}>
							Nothing needs your attention.
						</Typography>
					)}
					{items?.map((n) => (
						<NotificationItem key={n.id} notification={n} onChoose={choose} />
					))}
				</Box>
				<Box sx={{ p: 1, textAlign: "center" }}>
					<Button component={Link} to="/notifications" size="small" onClick={() => setAnchor(null)}>
						View all
					</Button>
				</Box>
			</Popover>
		</>
	);
}
