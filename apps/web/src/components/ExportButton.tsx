import DownloadIcon from "@mui/icons-material/Download";
import Button from "@mui/material/Button";
import { useState } from "react";
import { useNotify } from "./Notify";

/** Downloads the current (filtered) transactions as an Excel file. */
export default function ExportButton({ filters }: { filters: Record<string, string | undefined> }) {
	const [busy, setBusy] = useState(false);
	const notify = useNotify();

	async function download() {
		setBusy(true);
		try {
			const params = new URLSearchParams();
			for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
			const res = await fetch(`/api/export/transactions?${params}`);
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				notify(typeof body?.detail === "string" ? body.detail : "Export failed", "error");
				return;
			}
			const filename =
				/filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
				"maalu-transactions.xlsx";
			const url = URL.createObjectURL(await res.blob());
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			notify("Export failed", "error");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Button
			variant="outlined"
			color="inherit"
			size="small"
			startIcon={<DownloadIcon />}
			loading={busy}
			onClick={download}
		>
			Export
		</Button>
	);
}
