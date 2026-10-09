import RefreshIcon from "@mui/icons-material/Refresh";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

/** Re-runs the current route's loaders to refresh the table data. */
export default function RefreshButton() {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function refresh() {
		setPending(true);
		try {
			await router.invalidate({ sync: true });
		} finally {
			setPending(false);
		}
	}

	return (
		<Tooltip title="Refresh">
			<span>
				<IconButton aria-label="Refresh" onClick={refresh} disabled={pending}>
					{pending ? <CircularProgress size={20} /> : <RefreshIcon />}
				</IconButton>
			</span>
		</Tooltip>
	);
}
