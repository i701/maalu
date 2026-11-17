import { zodResolver } from "@hookform/resolvers/zod";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { accountForFilename } from "#/lib/imports";
import type { Account, ImportPreview } from "#/types/api";
import FormTextField from "../FormTextField";
import { accountMenuItems } from "../transaction-form/accountMenuItems";

const schema = z.object({ account_id: z.string() });

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
	const form = useForm({
		resolver: zodResolver(schema),
		mode: "onChange", // picking an account clears "choose the account" at once
		defaultValues: { account_id: "" },
	});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/** The file is the submit: the account is the one chosen, or the one its name points at. */
	async function read(file: File) {
		const chosen = form.getValues("account_id") || accountForFilename(accounts, file.name)?.id;
		if (!chosen) {
			form.setError("account_id", {
				message: "Choose the account this statement belongs to first",
			});
			return;
		}
		form.setValue("account_id", chosen);
		form.clearErrors("account_id");
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
			const preview: ImportPreview = await res.json();
			onPreview(preview, file.name);
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
					<FormTextField
						control={form.control}
						name="account_id"
						select
						label="Account"
						helperText="Or leave it and pick the file: the account is found from its number in the file name"
					>
						{accountMenuItems(accounts)}
						{accounts.length === 0 && <MenuItem disabled>No accounts yet</MenuItem>}
					</FormTextField>
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
