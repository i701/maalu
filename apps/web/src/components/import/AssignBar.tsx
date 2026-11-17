import { zodResolver } from "@hookform/resolvers/zod";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { RowPatch } from "#/lib/imports";
import { plural } from "#/lib/imports";
import type { Account } from "#/types/api";
import FormTextField from "../FormTextField";
import { accountMenuItems } from "../transaction-form/accountMenuItems";

// Blank leaves that thing as it is on each row.
const schema = z.object({
	vendor: z.string().trim().max(200),
	category: z.string().trim().max(100),
	transfer: z.string(),
	sameName: z.boolean(),
});
type Values = z.output<typeof schema>;

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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { vendor: "", category: "", transfer: "", sameName: true },
	});
	const [vendor, category, transfer] = useWatch({
		control,
		name: ["vendor", "category", "transfer"],
	});

	const setLabels = ({ vendor: v, category: c, sameName }: Values) =>
		onApply({ ...(v ? { vendor_name: v } : {}), ...(c ? { category_name: c } : {}) }, sameName);
	const markTransfer = ({ transfer: to, sameName }: Values) =>
		onApply({ transfer_account_id: to }, sameName);

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
					control={
						<Controller
							name="sameName"
							control={control}
							render={({ field }) => (
								<Switch
									size="small"
									checked={field.value}
									onChange={(_, on) => field.onChange(on)}
								/>
							)}
						/>
					}
					label="Also rows with the same name"
				/>
				<Button color="inherit" size="small" onClick={onClear}>
					Clear
				</Button>
			</Stack>
			<Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 1.5, alignItems: "flex-start" }}>
				<Controller
					name="vendor"
					control={control}
					render={({ field }) => (
						<Autocomplete
							freeSolo
							fullWidth
							size="small"
							options={vendors}
							inputValue={field.value}
							onInputChange={(_, v) => field.onChange(v)}
							renderInput={(params) => <TextField {...params} label="Vendor" />}
						/>
					)}
				/>
				<Controller
					name="category"
					control={control}
					render={({ field }) => (
						<Autocomplete
							freeSolo
							fullWidth
							size="small"
							options={categories}
							inputValue={field.value}
							onInputChange={(_, v) => field.onChange(v)}
							renderInput={(params) => <TextField {...params} label="Category" />}
						/>
					)}
				/>
				<Button
					variant="contained"
					disabled={!vendor.trim() && !category.trim()}
					onClick={() => void handleSubmit(setLabels)()}
					sx={{ flexShrink: 0 }}
				>
					Set
				</Button>
			</Stack>
			<Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 1.5, alignItems: "flex-start" }}>
				<FormTextField
					control={control}
					name="transfer"
					select
					fullWidth
					size="small"
					label="Transfer to or from my account"
					helperText="Money moving between your own accounts is not spending or income"
				>
					{accountMenuItems(otherAccounts)}
					{otherAccounts.length === 0 && <MenuItem disabled>No other accounts</MenuItem>}
				</FormTextField>
				<Button
					variant="contained"
					disabled={!transfer}
					onClick={() => void handleSubmit(markTransfer)()}
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
