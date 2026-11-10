import CloseIcon from "@mui/icons-material/Close";
import Money from "#/components/Money";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { formatDate, formatMoney } from "#/lib/format";
import { dateSpan } from "#/lib/groups";
import { useSheet } from "#/lib/sheet";
import { txTitle } from "#/lib/tx-display";
import { useAction } from "#/lib/use-action";
import { deleteGroupFn, getGroupFn, removeFromGroupFn } from "#/server/groups";
import type { GroupDetail } from "#/types/api";
import ConfirmDelete from "./ConfirmDelete";
import GroupForm from "./GroupForm";
import { useNotify } from "./Notify";

/** The group's summary: its dates and what it adds up to. */
function Summary({ group }: { group: GroupDetail }) {
	const net = Number(group.net);
	const both = Number(group.money_in) > 0 && Number(group.money_out) > 0;
	return (
		<>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{dateSpan(group.date_from, group.date_to)}
			</Typography>
			<Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", my: 1.5 }}>
				<Figure label="Transactions" value={String(group.transaction_count)} />
				<Figure
					label="Net"
					value={formatMoney(group.net, group.currency)}
					tone={net < 0 ? "error.main" : "text.primary"}
				/>
				{both && (
					<>
						<Figure label="Money in" value={formatMoney(group.money_in, group.currency)} />
						<Figure label="Money out" value={formatMoney(group.money_out, group.currency)} />
					</>
				)}
			</Box>
		</>
	);
}

/** The group's transactions, each with a button to take it out. */
function Members({
	transactions,
	disabled,
	onTake,
}: {
	transactions: GroupDetail["transactions"];
	disabled: boolean;
	onTake: (id: string) => void;
}) {
	return (
		<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
			{transactions.map((t) => (
				<Box
					component="li"
					key={t.id}
					sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}
				>
					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
							{txTitle(t)}
						</Typography>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{formatDate(t.transaction_date)}
						</Typography>
					</Box>
					<Typography
						variant="body2"
						sx={{
							fontVariantNumeric: "tabular-nums",
							color: t.type === "income" ? "success.main" : "text.primary",
						}}
					>
						{t.type === "income" ? "+" : "−"}
						<Money amount={t.amount} currency={t.currency} />
					</Typography>
					<IconButton
						size="small"
						aria-label={`Take ${txTitle(t)} out of the group`}
						title="Take out of the group"
						disabled={disabled}
						onClick={() => onTake(t.id)}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</Box>
			))}
		</Box>
	);
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
	return (
		<Box>
			<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
				{label}
			</Typography>
			<Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: tone }}>
				{value}
			</Typography>
		</Box>
	);
}

/** A group opened: what it adds up to, and its transactions (each can be taken out). */
export default function GroupDetailDialog({
	groupId,
	onClose,
}: {
	groupId: string;
	onClose: () => void;
}) {
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const { run, pending, error } = useAction();
	const [group, setGroup] = useState<GroupDetail | null>(null);
	const [failed, setFailed] = useState(false);
	const [editing, setEditing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const deleted = useRef(false);

	useEffect(() => {
		let current = true;
		void getGroupFn({ data: { id: groupId } }).then((res) => {
			if (!current) return;
			if (res.ok) setGroup(res.data);
			else setFailed(true);
		});
		return () => {
			current = false;
		};
	}, [groupId]);

	async function reload() {
		const res = await getGroupFn({ data: { id: groupId } });
		if (res.ok) setGroup(res.data);
	}

	async function take(transactionId: string) {
		let dissolved = false;
		const ok = await run(async () => {
			const res = await removeFromGroupFn({
				data: { id: groupId, transaction_ids: [transactionId] },
			});
			if (res.ok) dissolved = res.data.dissolved;
			return res;
		});
		if (!ok) return;
		if (dissolved) {
			notify("The group had too few transactions left, so it was deleted");
			sheet.close();
		} else await reload();
	}

	return (
		<>
			<Dialog
				open={sheet.open}
				onClose={sheet.close}
				maxWidth="sm"
				fullWidth
				aria-labelledby="group-title"
				slotProps={{ transition: { onExited: sheet.onExited } }}
			>
				<DialogTitle id="group-title" sx={{ pr: 12 }}>
					{group?.name ?? (failed ? "Group not found" : "Group")}
					{group && (
						<Box sx={{ position: "absolute", right: 12, top: 12 }}>
							<IconButton
								aria-label="Edit group"
								title="Edit"
								size="small"
								onClick={() => setEditing(true)}
							>
								<EditOutlinedIcon fontSize="small" />
							</IconButton>
							<IconButton
								aria-label="Delete group"
								title="Delete"
								size="small"
								onClick={() => setDeleting(true)}
							>
								<DeleteOutlineIcon fontSize="small" />
							</IconButton>
						</Box>
					)}
				</DialogTitle>
				<DialogContent>
					{group && (
						<>
							{group.note && (
								<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
									{group.note}
								</Typography>
							)}
							<Summary group={group} />
							<Typography
								variant="caption"
								sx={{ color: "text.secondary", display: "block", mb: 1 }}
							>
								Taking a transaction out, or deleting the group, never deletes the transactions. A
								group needs at least 2.
							</Typography>
							{error && (
								<Typography variant="caption" role="alert" sx={{ color: "error.main" }}>
									{error}
								</Typography>
							)}
							<Members
								transactions={group.transactions}
								disabled={pending}
								onTake={(id) => void take(id)}
							/>
						</>
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={sheet.close} color="inherit">
						Close
					</Button>
				</DialogActions>
			</Dialog>
			{group && editing && (
				<GroupForm
					group={group}
					onClose={() => {
						setEditing(false);
						void reload();
					}}
				/>
			)}
			{group && deleting && (
				<ConfirmDelete
					title="Delete group"
					message={`Delete "${group.name}"? Its ${group.transaction_count} transactions are kept and just stop being grouped.`}
					onConfirm={async () => {
						const res = await deleteGroupFn({ data: { id: group.id } });
						if (res.ok) deleted.current = true;
						return res;
					}}
					onClose={() => {
						setDeleting(false);
						if (deleted.current) sheet.close();
					}}
				/>
			)}
		</>
	);
}
