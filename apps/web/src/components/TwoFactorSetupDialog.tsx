import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { friendlyError, useAction } from "#/lib/use-action";
import { enableTwoFactorFn, startTwoFactorFn } from "#/server/auth";
import type { TwoFactorSetup } from "#/types/api";
import FormDialog from "./FormDialog";

/** Turn two-factor on: scan the QR code (or type the key) into an authenticator app, then confirm
 * with a code from it. The secret only counts once a code from it has been accepted. */
export default function TwoFactorSetupDialog({
	onEnabled,
	onClose,
}: {
	onEnabled: (recoveryCodes: string[]) => void;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
	const [setupError, setSetupError] = useState<string | null>(null);

	// Ask once. In dev React runs effects twice on purpose; the API hands back the same secret for a
	// repeated request, but there is no reason to send one.
	const asked = useRef(false);
	useEffect(() => {
		if (asked.current) return;
		asked.current = true;
		startTwoFactorFn().then(
			(res) => (res.ok ? setSetup(res.data) : setSetupError(res.error)),
			(e) => setSetupError(friendlyError(e)),
		);
	}, []);

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const code = String(new FormData(e.currentTarget).get("code")).trim();
		let codes: string[] = [];
		const done = await run(async () => {
			const res = await enableTwoFactorFn({ data: { code } });
			if (res.ok) codes = res.data.recovery_codes;
			return res;
		});
		if (done) {
			onEnabled(codes);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Set up two-factor"
			submitLabel="Turn on"
			error={setupError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
				Scan this with an authenticator app (such as Aegis, 2FAS, Google Authenticator or your
				password manager), then enter the 6-digit code it shows.
			</Typography>
			<Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
				{setup ? (
					<Box
						component="img"
						src={setup.qr_data_uri}
						alt="QR code for the authenticator app"
						sx={{ width: 200, height: 200, borderRadius: "var(--shape-md)", bgcolor: "#fff" }}
					/>
				) : setupError ? null : (
					<Skeleton variant="rounded" width={200} height={200} />
				)}
			</Box>
			{setup && (
				<Alert severity="info" icon={false} sx={{ mb: 2, wordBreak: "break-all" }}>
					Can't scan it? Enter this key by hand:{" "}
					<Box component="code" sx={{ userSelect: "all" }}>
						{setup.secret}
					</Box>
				</Alert>
			)}
			<TextField
				label="Authentication code"
				name="code"
				autoComplete="one-time-code"
				required
				disabled={!setup}
				slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9 ]*", maxLength: 7 } }}
			/>
		</FormDialog>
	);
}
