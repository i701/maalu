import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type FormEvent, useState } from "react";
import { daysFromChoice, EXPIRY_OPTIONS, KEEP_EXPIRY, roleOf, toggleScope } from "#/lib/api-keys";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createApiKeyFn, updateApiKeyFn } from "#/server/api-keys";
import type { ApiKey, ApiKeySecret, ScopeCatalog } from "#/types/api";
import FormDialog from "../FormDialog";

const CUSTOM = "custom";

/** Make a key or change one: its name, a role to start from, the exact permissions (a grid of
 * areas and actions) and how long it works. A key stores the permissions it is given, not the
 * role's name, so the grid is the truth and the role select only fills it in. */
export default function KeyFormDialog({
	catalog,
	apiKey,
	onCreated,
	onClose,
}: {
	catalog: ScopeCatalog;
	/** A key to change; left out to make a new one. */
	apiKey?: ApiKey;
	onCreated?: (result: ApiKeySecret) => void;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const [name, setName] = useState(apiKey?.name ?? "");
	const [scopes, setScopes] = useState<string[]>(
		apiKey?.scopes ?? catalog.roles.find((r) => r.key === "viewer")?.scopes ?? [],
	);
	const [expiry, setExpiry] = useState(apiKey ? KEEP_EXPIRY : "90");
	const [localError, setLocalError] = useState<string | null>(null);
	const role = roleOf(scopes, catalog.roles);

	function pickRole(value: string) {
		const picked = catalog.roles.find((r) => r.key === value);
		if (picked) setScopes([...picked.scopes]);
	}

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (scopes.length === 0) return setLocalError("Give the key at least one permission");
		setLocalError(null);
		if (apiKey) {
			const changes: { name: string; scopes: string[]; expires_in_days?: number | null } = {
				name: name.trim(),
				scopes,
			};
			if (expiry !== KEEP_EXPIRY) changes.expires_in_days = daysFromChoice(expiry);
			if (await run(() => updateApiKeyFn({ data: { id: apiKey.id, changes } }))) sheet.close();
			return;
		}
		let result: ApiKeySecret | undefined;
		const done = await run(async () => {
			const res = await createApiKeyFn({
				data: { name: name.trim(), scopes, expires_in_days: daysFromChoice(expiry) },
			});
			if (res.ok) result = res.data;
			return res;
		});
		if (done && result) {
			onCreated?.(result);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={apiKey ? `Change "${apiKey.name}"` : "New API key"}
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="sm"
			submitLabel={apiKey ? "Save" : "Make key"}
		>
			<Stack sx={{ gap: 2 }}>
				<TextField
					label="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					autoFocus
					helperText="What it is for, for example Telegram bot"
					slotProps={{ htmlInput: { maxLength: 100 } }}
				/>
				<TextField
					select
					label="Role"
					value={role?.key ?? CUSTOM}
					onChange={(e) => pickRole(e.target.value)}
					helperText={
						role?.description ?? "Your own mix: change the permissions below as you like."
					}
				>
					{catalog.roles.map((r) => (
						<MenuItem key={r.key} value={r.key}>
							{r.label}
						</MenuItem>
					))}
					<MenuItem value={CUSTOM} disabled={role !== null}>
						Custom
					</MenuItem>
				</TextField>

				<Box>
					<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
						Permissions
					</Typography>
					<Box
						role="group"
						aria-label="Permissions"
						sx={{
							display: "grid",
							gridTemplateColumns: "minmax(0, 1fr) repeat(3, 64px)",
							alignItems: "center",
							borderRadius: "var(--shape-md)",
							bgcolor: "var(--md-sys-color-surface-container-low)",
							px: 1.5,
							py: 0.5,
						}}
					>
						<span />
						{catalog.actions.map((a) => (
							<Typography
								key={a.key}
								variant="caption"
								sx={{ textAlign: "center", color: "text.secondary" }}
							>
								{a.key === "write" ? "Change" : a.key === "read" ? "See" : "Delete"}
							</Typography>
						))}
						{catalog.areas.map((area) => (
							<Box key={area.key} sx={{ display: "contents" }}>
								<Typography variant="body2" sx={{ py: 0.5 }}>
									{area.label}
								</Typography>
								{catalog.actions.map((action) => {
									const scope = `${area.key}:${action.key}`;
									return (
										<Box key={scope} sx={{ display: "flex", justifyContent: "center" }}>
											<Checkbox
												size="small"
												checked={scopes.includes(scope)}
												onChange={(_, on) => setScopes((s) => toggleScope(s, scope, on))}
												slotProps={{
													input: { "aria-label": `${area.label}: ${action.label}` },
												}}
											/>
										</Box>
									);
								})}
							</Box>
						))}
					</Box>
					<Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
						Sign-in, passwords, backups, receipts and managing keys are never available to a key.
					</Typography>
				</Box>

				<TextField
					select
					label="How long it works"
					value={expiry}
					onChange={(e) => setExpiry(e.target.value)}
					helperText={
						apiKey
							? "Counted from today. Keep leaves the end date as it is."
							: "Counted from today."
					}
				>
					{apiKey && <MenuItem value={KEEP_EXPIRY}>Keep as it is</MenuItem>}
					{EXPIRY_OPTIONS.map((o) => (
						<MenuItem key={o.value} value={o.value}>
							{o.label}
						</MenuItem>
					))}
				</TextField>
			</Stack>
		</FormDialog>
	);
}
