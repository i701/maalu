import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { useAction } from "#/lib/use-action";
import { unarchiveAccountFn } from "#/server/accounts";
import type { Account } from "#/types/api";
import MobileCard from "./MobileCard";
import { useNotify } from "./Notify";
import Reveal from "./Reveal";
import ShapeTile from "./ShapeTile";
import Symbol from "./Symbol";

function UnarchiveButton({ account }: { account: Account }) {
	const { run, pending } = useAction();
	const notify = useNotify();
	return (
		<IconButton
			aria-label="Unarchive"
			title="Unarchive"
			size="small"
			disabled={pending}
			onClick={async () => {
				if (await run(() => unarchiveAccountFn({ data: { id: account.id } })))
					notify(`"${account.name}" is back in use`);
			}}
		>
			<UnarchiveOutlinedIcon fontSize="small" />
		</IconButton>
	);
}

/** Closed accounts: out of the totals and the pickers, but their history is kept. Collapsed by
 * default, since they are not what you came to the page for. */
export default function ArchivedAccounts({
	accounts,
	onDelete,
}: {
	accounts: Account[];
	onDelete: (account: Account) => void;
}) {
	const [open, setOpen] = useState(false);
	if (accounts.length === 0) return null;

	return (
		<Box sx={{ mt: 3 }}>
			<Button
				color="inherit"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				startIcon={<Symbol name={open ? "expand_less" : "expand_more"} size={20} />}
			>
				Archived ({accounts.length})
			</Button>
			<Reveal in={open}>
				<Typography variant="body2" sx={{ color: "text.secondary", px: 1, py: 1 }}>
					Not counted in your totals or offered on new transactions. Their past transactions are
					kept.
				</Typography>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
						gap: 1,
					}}
				>
					{accounts.map((a) => (
						<Box
							key={a.id}
							sx={{
								bgcolor: "var(--md-sys-color-surface-container-low)",
								borderRadius: "var(--shape-xl)",
							}}
						>
							<MobileCard
								leading={
									<ShapeTile shape={0} size={52} accent={ACCENT.slate}>
										<Symbol name="account_balance" size={24} filled />
									</ShapeTile>
								}
								primary={
									<Typography variant="body2" sx={{ fontWeight: 500 }}>
										{a.name}
									</Typography>
								}
								end={
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										{formatMoney(a.balance, a.currency)}
									</Typography>
								}
								actions={
									<>
										<UnarchiveButton account={a} />
										<IconButton
											aria-label="Delete"
											title="Delete"
											size="small"
											onClick={() => onDelete(a)}
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</>
								}
							/>
						</Box>
					))}
				</Box>
			</Reveal>
		</Box>
	);
}
