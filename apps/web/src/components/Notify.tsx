import Alert from "@mui/material/Alert";
import Slide, { type SlideProps } from "@mui/material/Slide";
import type { TransitionProps } from "@mui/material/transitions";
import Snackbar from "@mui/material/Snackbar";
import { EASE_OUT } from "#/lib/motion";
import {
	type ComponentType,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

type Notify = (message: string, severity?: "success" | "error") => void;

/** Slides up from the bottom edge (and back down on exit) instead of MUI's default scale-grow. */
function SlideUp(props: SlideProps) {
	return <Slide {...props} direction="up" easing={{ enter: EASE_OUT, exit: EASE_OUT }} />;
}

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
				// Enter and leave through the same bottom edge it is anchored to.
				slots={{ transition: SlideUp as ComponentType<TransitionProps> }}
				transitionDuration={{ enter: 300, exit: 200 }}
			>
				<Alert severity={state.severity} variant="filled" sx={{ width: "100%" }}>
					{state.message}
				</Alert>
			</Snackbar>
		</NotifyContext.Provider>
	);
}
