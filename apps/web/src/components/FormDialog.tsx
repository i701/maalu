import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { ReactNode, SubmitEvent } from "react";
import { useLastDefined } from "#/lib/motion";
import type { Sheet } from "#/lib/sheet";
import Reveal from "./Reveal";

/** Form dialog styled by the theme's Dialog overrides. The <form> is `display: contents`, so the
 * title, content and actions stay the Paper's own flex children. */
export default function FormDialog({
	title,
	error,
	pending,
	onSubmit,
	sheet,
	children,
	maxWidth = "sm",
	fullWidth = false,
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
	/** Always as wide as maxWidth, instead of as wide as the content. */
	fullWidth?: boolean;
	/** The text of the submit button. */
	submitLabel?: string;
	/** Keeps the submit button off until the form can be sent. */
	submitDisabled?: boolean;
}) {
	const shownError = useLastDefined(error); // keeps the text while the alert closes
	// A form wider than "xs" has too many fields for a card on a phone: it takes the whole screen (M3's
	// full-screen dialog). The small ones (a name, an amount) stay a card.
	const phone = useMediaQuery((theme) => theme.breakpoints.down("sm"));

	return (
		<Dialog
			open={sheet.open}
			// not while it is saving: Escape or a click outside must not close a form mid-save
			onClose={pending ? undefined : sheet.close}
			fullScreen={phone && maxWidth !== "xs"}
			maxWidth={maxWidth}
			fullWidth={fullWidth}
			aria-labelledby="form-dialog-title"
			slotProps={{
				transition: { onExited: sheet.onExited },
			}}
		>
			<form onSubmit={onSubmit} noValidate style={{ display: "contents" }}>
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
				<DialogActions sx={{ px: 3, pb: "max(16px, env(safe-area-inset-bottom))" }}>
					<Button onClick={sheet.close} color="inherit" disabled={pending}>
						Cancel
					</Button>
					<Button type="submit" variant="contained" loading={pending} disabled={submitDisabled}>
						{submitLabel}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
}
