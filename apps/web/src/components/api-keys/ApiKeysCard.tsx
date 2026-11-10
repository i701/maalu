import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo, useState } from "react";
import { expiryText, permissionLines, roleLabel } from "#/lib/api-keys";
import { formatAgo } from "#/lib/format";
import { deleteApiKeyFn } from "#/server/api-keys";
import type { ApiKey, ApiKeySecret, ScopeCatalog } from "#/types/api";
import ConfirmDelete from "../ConfirmDelete";
import { ROW_FILL } from "../ResponsiveTable";
import KeyFormDialog from "./KeyFormDialog";
import RotateDialog from "./RotateDialog";
import SecretDialog from "./SecretDialog";

const KeyRow = memo(function KeyRow({
	apiKey,
	catalog,
	onEdit,
	onRotate,
	onDelete,
}: {
	apiKey: ApiKey;
	catalog: ScopeCatalog;
	onEdit: (key: ApiKey) => void;
	onRotate: (key: ApiKey) => void;
	onDelete: (key: ApiKey) => void;
}) {
	const lines = permissionLines(apiKey.scopes, catalog);
	return (
		<Stack sx={{ gap: 0.75, px: 2, py: 1.5, bgcolor: ROW_FILL, borderRadius: "var(--shape-md)" }}>
			<Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
				<Typography sx={{ fontWeight: 500 }}>{apiKey.name}</Typography>
				<Chip size="small" label={roleLabel(apiKey, catalog)} />
				{apiKey.status === "expired" && <Chip size="small" color="error" label="Expired" />}
				{apiKey.grace_until && (
					<Chip size="small" color="warning" label="Old secret still works for a while" />
				)}
			</Stack>
			<Typography
				variant="body2"
				sx={{ color: "text.secondary", fontFamily: "ui-monospace, Menlo, monospace" }}
			>
				{apiKey.prefix}…
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{expiryText(apiKey)} ·{" "}
				{apiKey.last_used_at
					? `Last used ${formatAgo(apiKey.last_used_at)}${apiKey.last_used_ip ? ` from ${apiKey.last_used_ip}` : ""}`
					: "Never used"}
			</Typography>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{lines.join(" · ") || "No permissions"}
			</Typography>
			<Stack direction="row" sx={{ gap: 0.5, mt: 0.5, ml: -1, flexWrap: "wrap" }}>
				<Button size="small" onClick={() => onEdit(apiKey)}>
					Change
				</Button>
				<Button size="small" onClick={() => onRotate(apiKey)}>
					Rotate
				</Button>
				<Button size="small" color="error" onClick={() => onDelete(apiKey)}>
					Delete
				</Button>
			</Stack>
		</Stack>
	);
});

/** The Settings card for API keys: what each may do, how long it lasts, when it was last used, and
 * the ways to change, rotate or delete one. The secret is shown once, when a key is made or
 * rotated, and never again. */
export default function ApiKeysCard({ keys, catalog }: { keys: ApiKey[]; catalog: ScopeCatalog }) {
	const [editing, setEditing] = useState<ApiKey | "new" | null>(null);
	const [rotating, setRotating] = useState<ApiKey | null>(null);
	const [deleting, setDeleting] = useState<ApiKey | null>(null);
	const [secret, setSecret] = useState<{ result: ApiKeySecret; note?: string } | null>(null);

	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Stack
					direction="row"
					sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1 }}
				>
					<div>
						<Typography variant="h2" component="h2" sx={{ mb: 0.5 }}>
							API keys
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Let a bot, a script or an AI agent use your Maalu without your password. Each key gets
							only the permissions you choose, and stops working on its end date.
						</Typography>
					</div>
					<Button
						variant="outlined"
						startIcon={<AddIcon />}
						onClick={() => setEditing("new")}
						sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
					>
						New key
					</Button>
				</Stack>
				{keys.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
						No keys yet.
					</Typography>
				) : (
					<Stack spacing={1}>
						{keys.map((k) => (
							<KeyRow
								key={k.id}
								apiKey={k}
								catalog={catalog}
								onEdit={setEditing}
								onRotate={setRotating}
								onDelete={setDeleting}
							/>
						))}
					</Stack>
				)}
			</CardContent>

			{editing && (
				<KeyFormDialog
					catalog={catalog}
					apiKey={editing === "new" ? undefined : editing}
					onCreated={(result) => setSecret({ result })}
					onClose={() => setEditing(null)}
				/>
			)}
			{rotating && (
				<RotateDialog
					apiKey={rotating}
					onRotated={(result, grace) =>
						setSecret({
							result,
							note:
								grace > 0
									? `The old secret keeps working for ${grace === 1 ? "1 hour" : `${grace} hours`}.`
									: "The old secret has stopped working.",
						})
					}
					onClose={() => setRotating(null)}
				/>
			)}
			{secret && (
				<SecretDialog
					secret={secret.result.secret}
					title={secret.note ? "Your new key" : "Your key"}
					rotated={secret.note}
					onClose={() => setSecret(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title={`Delete "${deleting.name}"?`}
					message="Whatever uses this key stops working at once. This cannot be undone."
					onConfirm={() => deleteApiKeyFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
					doneMessage="Key deleted"
				/>
			)}
		</Card>
	);
}
