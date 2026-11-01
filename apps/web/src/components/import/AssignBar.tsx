import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type ReactNode, useState } from "react";
import type { RowPatch } from "#/lib/imports";
import { plural } from "#/lib/imports";
import type { Account } from "#/types/api";
import { accountMenuItems } from "../transaction-form/accountMenuItems";

/** What to do with the selected rows: give them a vendor and category, mark them as a transfer to
 * another of your accounts, or leave them out. A vendor is usually chosen once for every row the
 * bank names the same way, so that is on by default. */
export default function AssignBar({
	count,
	vendors,
	categories,
	otherAccounts,
	onApply,
	onClear,
	extra,
}: {
	count: number;
	vendors: string[];
	categories: string[];
	otherAccounts: Account[];
	onApply: (patch: RowPatch, sameName: boolean) => void;
	onClear: () => void;
	/** Beside the count, for example an offer to select more. */
	extra?: ReactNode;
}) {
	const [vendor, setVendor] = useState("");
	const [category, setCategory] = useState("");
	const [transfer, setTransfer] = useState("");
	const [sameName, setSameName] = useState(true);

	const setLabels = () => {
		onApply(
			{
				...(vendor.trim() ? { vendor_name: vendor.trim() } : {}),
				...(category.trim() ? { category_name: category.trim() } : {}),
			},
			sameName,
		);
	};

	return (
		<Stack
			role="toolbar"
			aria-label="Actions for the selected rows"
			sx={{
				gap: 1.5,
				mx: 1.5,
				mb: 1.5,
				p: 2,
				borderRadius: "var(--shape-lg)",
				bgcolor: "var(--md-sys-color-secondary-container)",
				color: "var(--md-sys-color-on-secondary-container)",
			}}
		>
			<Stack direction="row" sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
				<Typography variant="body2" sx={{ fontWeight: 600, mr: "auto" }} aria-live="polite">
					{plural(count, "row")} selected
				</Typography>
				{extra}
				<FormControlLabel
					control={<Switch size="small" checked={sameName} onChange={(_, v) => setSameName(v)} />}
					label="Also rows with the same name"
				/>
				<Button color="inherit" size="small" onClick={onClear}>
					Clear
				</Button>
			</Stack>
			<Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 1.5, alignItems: "flex-start" }}>
				<Autocomplete
					freeSolo
					fullWidth
					size="small"
					options={vendors}
					inputValue={vendor}
					onInputChange={(_, v) => setVendor(v)}
					renderInput={(params) => <TextField {...params} label="Vendor" />}
				/>
				<Autocomplete
					freeSolo
					fullWidth
					size="small"
					options={categories}
					inputValue={category}
					onInputChange={(_, v) => setCategory(v)}
					renderInput={(params) => <TextField {...params} label="Category" />}
				/>
				<Button
					variant="contained"
					disabled={!vendor.trim() && !category.trim()}
					onClick={setLabels}
					sx={{ flexShrink: 0 }}
				>
					Set
				</Button>
			</Stack>
			<Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 1.5, alignItems: "flex-start" }}>
				<TextField
					select
					fullWidth
					size="small"
					label="Transfer to or from my account"
					value={transfer}
					onChange={(e) => setTransfer(e.target.value)}
					helperText="Money moving between your own accounts is not spending or income"
				>
					{accountMenuItems(otherAccounts)}
					{otherAccounts.length === 0 && <MenuItem disabled>No other accounts</MenuItem>}
				</TextField>
				<Button
					variant="contained"
					disabled={!transfer}
					onClick={() => onApply({ transfer_account_id: transfer }, sameName)}
					sx={{ flexShrink: 0 }}
				>
					Mark as transfer
				</Button>
			</Stack>
			<Stack direction="row" sx={{ gap: 1 }}>
				<Button color="inherit" onClick={() => onApply({ include: false }, false)}>
					Leave out
				</Button>
				<Button color="inherit" onClick={() => onApply({ include: true }, false)}>
					Include
				</Button>
			</Stack>
		</Stack>
	);
}
