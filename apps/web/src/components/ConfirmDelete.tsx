import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useLastDefined } from "#/lib/motion";
import { useAction } from "#/lib/use-action";
import type { ApiResult } from "#/types/api";
import { useNotify } from "./Notify";
import Reveal from "./Reveal";

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
	const shownError = useLastDefined(error); // keeps the text while the alert closes

	return (
		<Dialog open onClose={onClose} maxWidth="xs" aria-labelledby="confirm-title">
			<DialogTitle id="confirm-title">{title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{message}</DialogContentText>
				<Reveal in={Boolean(error)}>
					<Alert severity="error" sx={{ mt: 2 }}>
						{shownError}
					</Alert>
				</Reveal>
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
