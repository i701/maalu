import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { disableTwoFactorFn, newRecoveryCodesFn } from "#/server/auth";
import { useNotify } from "./Notify";
import RecoveryCodesDialog from "./RecoveryCodesDialog";
import TwoFactorConfirmDialog from "./TwoFactorConfirmDialog";
import TwoFactorSetupDialog from "./TwoFactorSetupDialog";

type Dialog = "setup" | "disable" | "codes" | null;

/** The Settings card for two-factor sign-in: set it up, make new recovery codes, turn it off. */
export default function TwoFactorSettings({ enabled }: { enabled: boolean }) {
	const notify = useNotify();
	const [dialog, setDialog] = useState<Dialog>(null);
	// Recovery codes to show, once, after setting up or making new ones.
	const [shown, setShown] = useState<string[] | null>(null);
	const close = () => setDialog(null);

	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
					<Typography variant="h2" component="h2">
						Two-factor sign-in
					</Typography>
					<Chip
						size="small"
						color={enabled ? "success" : "default"}
						label={enabled ? "On" : "Off"}
					/>
				</Stack>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
					{enabled
						? "Signing in also needs a 6-digit code from your authenticator app, or one of your recovery codes."
						: "Ask for a 6-digit code from an authenticator app when you sign in, on top of your password."}
				</Typography>
				<Typography variant="caption" component="p" sx={{ color: "text.secondary", mb: 2, mt: -1 }}>
					Turning it on or off, or making new recovery codes, signs out your other devices.
				</Typography>
				<Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
					{enabled ? (
						<>
							<Button variant="outlined" onClick={() => setDialog("codes")}>
								New recovery codes
							</Button>
							<Button color="error" onClick={() => setDialog("disable")}>
								Turn off
							</Button>
						</>
					) : (
						<Button variant="contained" onClick={() => setDialog("setup")}>
							Set up
						</Button>
					)}
				</Stack>
			</CardContent>

			{dialog === "setup" && <TwoFactorSetupDialog onEnabled={setShown} onClose={close} />}
			{dialog === "disable" && (
				<TwoFactorConfirmDialog
					title="Turn off two-factor"
					submitLabel="Turn off"
					help="Signing in will only need your password again"
					send={(values) => disableTwoFactorFn({ data: values })}
					onDone={() => notify("Two-factor is off")}
					onClose={close}
				/>
			)}
			{dialog === "codes" && (
				<TwoFactorConfirmDialog
					title="New recovery codes"
					submitLabel="Make new codes"
					help="The codes you have now stop working"
					send={(values) => newRecoveryCodesFn({ data: values })}
					onDone={(data) => setShown(data.recovery_codes)}
					onClose={close}
				/>
			)}
			{shown && <RecoveryCodesDialog codes={shown} onClose={() => setShown(null)} />}
		</Card>
	);
}
