import ButtonBase from "@mui/material/ButtonBase";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatAgo } from "#/lib/format";
import { KIND_META } from "#/lib/notifications";
import type { AppNotification } from "#/types/api";
import TonalChip from "./TonalChip";

/** One notification in the bell's popover: unread ones have a dot and a bolder title. */
const NotificationItem = memo(function NotificationItem({
	notification: n,
	onChoose,
}: {
	notification: AppNotification;
	onChoose: (n: AppNotification) => void;
}) {
	const meta = KIND_META[n.kind];
	return (
		<ButtonBase
			onClick={() => onChoose(n)}
			sx={{
				display: "flex",
				width: "100%",
				justifyContent: "flex-start",
				textAlign: "left",
				gap: 1.5,
				px: 2,
				py: 1.25,
				alignItems: "flex-start",
			}}
		>
			<Box
				aria-hidden
				sx={{
					mt: 0.75,
					width: 8,
					height: 8,
					flexShrink: 0,
					borderRadius: "50%",
					bgcolor: n.read_at ? "transparent" : "primary.main",
				}}
			/>
			<Stack sx={{ minWidth: 0, gap: 0.25 }}>
				<Typography variant="body2" sx={{ fontWeight: n.read_at ? 400 : 600 }}>
					{n.title}
				</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{n.body}
				</Typography>
				<Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 0.5 }}>
					<TonalChip accent={meta.accent} label={meta.label} />
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{formatAgo(n.created_at)}
					</Typography>
				</Stack>
			</Stack>
		</ButtonBase>
	);
});

export default NotificationItem;
