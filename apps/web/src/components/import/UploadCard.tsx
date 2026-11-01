import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { accountForFilename } from "#/lib/imports";
import type { Account, ImportPreview } from "#/types/api";
import { accountMenuItems } from "../transaction-form/accountMenuItems";

/** Step one: say which account a statement belongs to and pick the file. The API reads it and
 * answers with what is inside (nothing is saved yet). The account is guessed from the file name
 * when it contains an account's number. */
export default function UploadCard({
	accounts,
	onPreview,
}: {
	accounts: Account[];
	onPreview: (preview: ImportPreview, filename: string) => void;
}) {
	const picker = useRef<HTMLInputElement>(null);
	const [accountId, setAccountId] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function read(file: File) {
		const chosen = accountId || accountForFilename(accounts, file.name)?.id;
		if (!chosen) {
			setError("Choose the account this statement belongs to first.");
			return;
		}
		setAccountId(chosen);
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(`/api/imports/preview?account_id=${chosen}`, {
				method: "POST",
				body: file,
			});
			if (!res.ok) {
				const failure = await res.json().catch(() => null);
				setError(
					typeof failure?.detail === "string" ? failure.detail : "That file could not be read.",
				);
				return;
			}
			onPreview((await res.json()) as ImportPreview, file.name);
		} catch {
			setError("That file could not be read.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card>
			<CardContent>
				<Stack sx={{ gap: 2 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Import a bank statement
					</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Choose the account, then the CSV you downloaded from BML or MIB. You review everything
						before anything is saved.
					</Typography>
					<TextField
						select
						label="Account"
						value={accountId}
						onChange={(e) => setAccountId(e.target.value)}
						helperText="Or leave it and pick the file: the account is found from its number in the file name"
					>
						{accountMenuItems(accounts)}
						{accounts.length === 0 && <MenuItem disabled>No accounts yet</MenuItem>}
					</TextField>
					{error && <Alert severity="error">{error}</Alert>}
					<Stack direction="row">
						<Button
							variant="contained"
							startIcon={<UploadFileIcon />}
							disabled={busy || accounts.length === 0}
							onClick={() => picker.current?.click()}
						>
							{busy ? "Reading…" : "Choose statement (CSV)"}
						</Button>
					</Stack>
					<input
						ref={picker}
						type="file"
						accept=".csv,text/csv"
						hidden
						onChange={(e) => {
							const file = e.target.files?.[0];
							e.target.value = ""; // so the same file can be chosen again
							if (file) void read(file);
						}}
					/>
				</Stack>
			</CardContent>
		</Card>
	);
}
