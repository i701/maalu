import Box from "@mui/material/Box";
import Slide, { type SlideProps } from "@mui/material/Slide";
import type { TransitionProps } from "@mui/material/transitions";
import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import Symbol from "./Symbol";
import {
	type ComponentType,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

type Notify = (message: string, severity?: "success" | "error") => void;

/** Slides up from the bottom edge on the default spatial spring (and back down on exit). */
function SlideUp(props: SlideProps) {
	return (
		<Slide
			{...props}
			direction="up"
			easing={{ enter: "var(--spring-spatial-default)", exit: "var(--ease-emph-accel)" }}
		/>
	);
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
				// Clear the bottom navigation bar.
				sx={{
					bottom: {
						xs: "calc(96px + env(safe-area-inset-bottom)) !important",
						md: "calc(96px + env(safe-area-inset-bottom)) !important",
					},
				}}
				// Enter and leave through the same bottom edge it is anchored to.
				slots={{ transition: SlideUp as ComponentType<TransitionProps> }}
				transitionDuration={{ enter: 484, exit: 200 }}
			>
				<SnackbarContent
					// The demo's snackbar: the inverse surface, 8px corners, a soft lift and a coloured
					// status icon.
					message={
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
							<Symbol
								name={state.severity === "error" ? "close" : "check"}
								size={20}
								filled
								sx={{
									color:
										state.severity === "error"
											? "var(--md-sys-color-error)"
											: "var(--md-sys-color-inverse-primary)",
								}}
							/>
							{state.message}
						</Box>
					}
					sx={{
						borderRadius: "var(--shape-sm)",
						bgcolor: "var(--md-sys-color-inverse-surface)",
						color: "var(--md-sys-color-inverse-on-surface)",
						boxShadow: "var(--elev-3)",
						"& .MuiSnackbarContent-message": { py: 0.25 },
					}}
				/>
			</Snackbar>
		</NotifyContext.Provider>
	);
}
