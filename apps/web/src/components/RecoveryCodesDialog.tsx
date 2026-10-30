import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { useSheet } from "#/lib/sheet";
import { useNotify } from "./Notify";

/** The recovery codes, shown once. Each works once in place of an authenticator code, so they are
 * the way back in when the phone is lost. */
export default function RecoveryCodesDialog({
	codes,
	onClose,
}: {
	codes: string[];
	onClose: () => void;
}) {
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const text = codes.join("\n");

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			notify("Recovery codes copied");
		} catch {
			notify("Could not copy. Select the codes and copy them by hand", "warning");
		}
	}

	function download() {
		const url = URL.createObjectURL(
			new Blob([`Maalu recovery codes\n\n${text}\n`], { type: "text/plain" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = "maalu-recovery-codes.txt";
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<Dialog
			open={sheet.open}
			onClose={(_, reason) => reason === "escapeKeyDown" && sheet.close()}
			maxWidth="xs"
			slotProps={{ transition: { onExited: sheet.onExited } }}
		>
			<DialogTitle>Save your recovery codes</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 2 }}>
					They are shown only once. Keep them somewhere safe, apart from your phone. Each one works
					once if you lose your authenticator app.
				</Alert>
				<Box
					component="ul"
					sx={{
						m: 0,
						p: 2,
						listStyle: "none",
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 1,
						borderRadius: "var(--shape-md)",
						bgcolor: "var(--md-sys-color-surface-container-high)",
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
						fontSize: 15,
						userSelect: "all",
					}}
				>
					{codes.map((code) => (
						<li key={code}>{code}</li>
					))}
				</Box>
				<Stack direction="row" spacing={1} sx={{ mt: 2 }}>
					<Button onClick={copy} color="inherit">
						Copy
					</Button>
					<Button onClick={download} color="inherit">
						Download
					</Button>
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button variant="contained" onClick={sheet.close}>
					I have saved them
				</Button>
			</DialogActions>
		</Dialog>
	);
}
