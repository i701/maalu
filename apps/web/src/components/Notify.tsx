import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

type Notify = (message: string, severity?: "success" | "error") => void;

const NotifyContext = createContext<Notify>(() => {});

export const useNotify = () => useContext(NotifyContext);

export function NotifyProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<{
		message: string;
		severity: "success" | "error";
		open: boolean;
	}>({ message: "", severity: "success", open: false });

	const notify = useCallback<Notify>(
		(message, severity = "success") => setState({ message, severity, open: true }),
		[],
	);

	return (
		<NotifyContext.Provider value={notify}>
			{children}
			<Snackbar
				open={state.open}
				autoHideDuration={4000}
				onClose={(_, reason) => reason !== "clickaway" && setState((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert severity={state.severity} variant="filled" sx={{ width: "100%" }}>
					{state.message}
				</Alert>
			</Snackbar>
		</NotifyContext.Provider>
	);
}
