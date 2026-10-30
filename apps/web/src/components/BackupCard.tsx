import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { restoredMessage } from "#/lib/backup";
import { useNotify } from "./Notify";

/** The Settings card for backup: download everything you own as one file, or restore such a file
 * into an empty account. */
export default function BackupCard() {
	const router = useRouter();
	const notify = useNotify();
	const picker = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState<"download" | "restore" | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function download() {
		setBusy("download");
		setError(null);
		try {
			const res = await fetch("/api/backup");
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				setError(typeof body?.detail === "string" ? body.detail : "The backup failed");
				return;
			}
			const filename =
				/filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
				"maalu-backup.json";
			const url = URL.createObjectURL(await res.blob());
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			setError("The backup failed");
		} finally {
			setBusy(null);
		}
	}

	async function restore(file: File) {
		setBusy("restore");
		setError(null);
		try {
			const res = await fetch("/api/backup", { method: "POST", body: file });
			if (!res.ok) {
				const failure = await res.json().catch(() => null);
				setError(typeof failure?.detail === "string" ? failure.detail : "The restore failed");
				return;
			}
			const body = await res.json().catch(() => null);
			notify(restoredMessage(body?.restored ?? {}));
			await router.invalidate({ sync: true });
		} catch {
			setError("The restore failed");
		} finally {
			setBusy(null);
			if (picker.current) picker.current.value = "";
		}
	}

	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="h2" component="h2" sx={{ mb: 0.5 }}>
					Backup
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
					One file with everything you own: accounts, transactions, categories, tags, budgets, goals
					and templates. It has no password or sign-in details, but it is your financial data in
					plain text, so keep it somewhere safe. To restore it, sign in to a new, empty account and
					choose the file here.
				</Typography>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}
				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
					<Button
						variant="outlined"
						startIcon={<DownloadIcon />}
						loading={busy === "download"}
						disabled={busy !== null}
						onClick={download}
					>
						Download backup
					</Button>
					<Button
						variant="outlined"
						color="inherit"
						startIcon={<UploadFileIcon />}
						loading={busy === "restore"}
						disabled={busy !== null}
						onClick={() => picker.current?.click()}
					>
						Restore from a file
					</Button>
					<input
						ref={picker}
						type="file"
						accept=".json,application/json"
						hidden
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) void restore(file);
						}}
					/>
				</Box>
			</CardContent>
		</Card>
	);
}
