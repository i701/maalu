import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useAction } from "#/lib/use-action";
import type { ApiResult } from "#/types/api";
import { useNotify } from "./Notify";

export default function ConfirmDelete({
	title,
	message,
	onConfirm,
	onClose,
}: {
	title: string;
	message: string;
	onConfirm: () => Promise<ApiResult<void>>;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const notify = useNotify();

	return (
		<Dialog open onClose={onClose} maxWidth="xs" aria-labelledby="confirm-title">
			<DialogTitle id="confirm-title">{title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{message}</DialogContentText>
				{error && (
					<Alert severity="error" sx={{ mt: 2 }}>
						{error}
					</Alert>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} color="inherit">
					Cancel
				</Button>
				<Button
					color="error"
					variant="contained"
					loading={pending}
					onClick={async () => {
						if (await run(onConfirm)) {
							notify("Deleted");
							onClose();
						}
					}}
				>
					Delete
				</Button>
			</DialogActions>
		</Dialog>
	);
}
