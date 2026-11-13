import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactNode, SubmitEvent } from "react";
import { useLastDefined } from "#/lib/motion";
import type { Sheet } from "#/lib/sheet";
import Reveal from "./Reveal";

/** Form dialog following the MUI "form dialog" pattern (the Paper is the <form>), styled by the
 * theme's Dialog overrides. */
export default function FormDialog({
	title,
	error,
	pending,
	onSubmit,
	sheet,
	children,
	maxWidth = "sm",
	submitLabel = "Save",
	submitDisabled = false,
}: {
	title: string;
	error: string | null;
	pending: boolean;
	onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
	/** From useSheet(onClose): drives the fade in and out. */
	sheet: Sheet;
	children: ReactNode;
	maxWidth?: "xs" | "sm" | "md";
	/** The text of the submit button. */
	submitLabel?: string;
	/** Keeps the submit button off until the form can be sent. */
	submitDisabled?: boolean;
}) {
	const shownError = useLastDefined(error); // keeps the text while the alert closes

	return (
		<Dialog
			open={sheet.open}
			// not while it is saving: Escape or a click outside must not close a form mid-save
			onClose={pending ? undefined : sheet.close}
			maxWidth={maxWidth}
			aria-labelledby="form-dialog-title"
			slotProps={{
				transition: { onExited: sheet.onExited },
				paper: {
					component: "form",
					onSubmit: (e: SubmitEvent<HTMLDivElement>) =>
						onSubmit(e as unknown as SubmitEvent<HTMLFormElement>),
				},
			}}
		>
			<DialogTitle id="form-dialog-title">{title}</DialogTitle>
			<DialogContent>
				{/* A disabled fieldset turns every field, switch and button inside it off while the form
				    is saving, so nothing can be changed or sent twice before it has been committed. */}
				<Box
					component="fieldset"
					disabled={pending}
					sx={{ border: 0, m: 0, p: 0, pt: 1, minWidth: 0 }}
				>
					{children}
				</Box>
				<Reveal in={Boolean(error)}>
					<Alert severity="error" sx={{ mt: 2 }}>
						{shownError}
					</Alert>
				</Reveal>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={sheet.close} color="inherit" disabled={pending}>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="contained"
					loading={pending}
					disabled={submitDisabled}
				>
					{submitLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
