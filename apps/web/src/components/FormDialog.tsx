import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { FormEvent, ReactNode } from "react";

/** Form dialog following the MUI "form dialog" pattern: the Paper is the <form>. */
export default function FormDialog({
	title,
	error,
	pending,
	onSubmit,
	onClose,
	children,
	maxWidth = "sm",
}: {
	title: string;
	error: string | null;
	pending: boolean;
	onSubmit: (e: FormEvent<HTMLFormElement>) => void;
	onClose: () => void;
	children: ReactNode;
	maxWidth?: "xs" | "sm" | "md";
}) {
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={maxWidth}
			fullScreen={fullScreen}
			aria-labelledby="form-dialog-title"
			slotProps={{
				paper: {
					component: "form",
					onSubmit: (e: FormEvent<HTMLDivElement>) =>
						onSubmit(e as unknown as FormEvent<HTMLFormElement>),
				},
			}}
		>
			<DialogTitle id="form-dialog-title">{title}</DialogTitle>
			<DialogContent dividers={fullScreen}>
				<div style={{ paddingTop: 8 }}>{children}</div>
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
				<Button type="submit" variant="contained" loading={pending}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
