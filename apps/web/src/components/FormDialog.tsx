import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { FormEvent, ReactNode } from "react";
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
}: {
	title: string;
	error: string | null;
	pending: boolean;
	onSubmit: (e: FormEvent<HTMLFormElement>) => void;
	/** From useSheet(onClose): drives the fade in and out. */
	sheet: Sheet;
	children: ReactNode;
	maxWidth?: "xs" | "sm" | "md";
}) {
	const shownError = useLastDefined(error); // keeps the text while the alert closes

	return (
		<Dialog
			open={sheet.open}
			onClose={sheet.close}
			maxWidth={maxWidth}
			aria-labelledby="form-dialog-title"
			slotProps={{
				transition: { onExited: sheet.onExited },
				paper: {
					component: "form",
					onSubmit: (e: FormEvent<HTMLDivElement>) =>
						onSubmit(e as unknown as FormEvent<HTMLFormElement>),
				},
			}}
		>
			<DialogTitle id="form-dialog-title">{title}</DialogTitle>
			<DialogContent>
				<div style={{ paddingTop: 8 }}>{children}</div>
				<Reveal in={Boolean(error)}>
					<Alert severity="error" sx={{ mt: 2 }}>
						{shownError}
					</Alert>
				</Reveal>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={sheet.close} color="inherit">
					Cancel
				</Button>
				<Button type="submit" variant="contained" loading={pending}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
