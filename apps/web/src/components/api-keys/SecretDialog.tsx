import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useSheet } from "#/lib/sheet";
import { useNotify } from "../Notify";

/** A key's secret, shown once. Only the Done button or Escape closes it, so it is not dismissed by
 * a stray click before it has been copied. */
export default function SecretDialog({
	secret,
	title,
	rotated,
	onClose,
}: {
	secret: string;
	title: string;
	/** After a rotation: what happens to the old secret, said in the warning. */
	rotated?: string;
	onClose: () => void;
}) {
	const sheet = useSheet(onClose);
	const notify = useNotify();

	async function copy() {
		try {
			await navigator.clipboard.writeText(secret);
			notify("Key copied");
		} catch {
			notify("Could not copy. Select the key and copy it by hand", "warning");
		}
	}

	return (
		<Dialog
			open={sheet.open}
			onClose={(_, reason) => reason === "escapeKeyDown" && sheet.close()}
			maxWidth="sm"
			fullWidth
			slotProps={{ transition: { onExited: sheet.onExited } }}
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 2 }}>
					Copy it now: it is shown only once and cannot be looked up later. Keep it as you would a
					password.{rotated ? ` ${rotated}` : ""}
				</Alert>
				<Box
					sx={{
						p: 2,
						borderRadius: "var(--shape-md)",
						bgcolor: "var(--md-sys-color-surface-container-high)",
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
						fontSize: 14,
						wordBreak: "break-all",
						userSelect: "all",
					}}
				>
					{secret}
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={copy} color="inherit">
					Copy
				</Button>
				<Button variant="contained" onClick={sheet.close}>
					Done
				</Button>
			</DialogActions>
		</Dialog>
	);
}
