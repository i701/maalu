import { zodResolver } from "@hookform/resolvers/zod";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { destination, nameKey, plural } from "#/lib/imports";
import type { ReviewRow, RowPatch } from "#/lib/imports";
import type { Account } from "#/types/api";

const editSchema = z.object({
	vendor_name: z.string().trim().max(200),
	category_name: z.string().trim().max(100),
	sameName: z.boolean(),
});

function Editor({
	row,
	vendors,
	categories,
	others,
	onSave,
	onCancel,
}: {
	row: ReviewRow;
	vendors: string[];
	categories: string[];
	/** How many other rows the bank named the same way */
	others: number;
	onSave: (patch: RowPatch, sameName: boolean) => void;
	onCancel: () => void;
}) {
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(editSchema),
		defaultValues: {
			vendor_name: row.vendor_name,
			category_name: row.category_name,
			sameName: true,
		},
	});
	return (
		<Stack
			component="form"
			sx={{ gap: 0.5, minWidth: 280 }}
			onSubmit={handleSubmit(({ sameName, ...patch }) => onSave(patch, sameName))}
			onKeyDown={(e) => e.key === "Escape" && onCancel()}
		>
			<Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
				<Controller
					name="vendor_name"
					control={control}
					render={({ field, fieldState }) => (
						<Autocomplete
							freeSolo
							fullWidth
							size="small"
							options={vendors}
							inputValue={field.value}
							onInputChange={(_, v) => field.onChange(v)}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Vendor"
									autoFocus
									error={Boolean(fieldState.error)}
									helperText={fieldState.error?.message}
								/>
							)}
						/>
					)}
				/>
				<Controller
					name="category_name"
					control={control}
					render={({ field, fieldState }) => (
						<Autocomplete
							freeSolo
							fullWidth
							size="small"
							options={categories}
							inputValue={field.value}
							onInputChange={(_, v) => field.onChange(v)}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Category"
									error={Boolean(fieldState.error)}
									helperText={fieldState.error?.message}
								/>
							)}
						/>
					)}
				/>
				<IconButton type="submit" size="small" aria-label="Save" title="Save">
					<CheckIcon fontSize="small" />
				</IconButton>
				<IconButton size="small" aria-label="Cancel" title="Cancel" onClick={onCancel}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Stack>
			{others > 0 && (
				<FormControlLabel
					control={
						<Controller
							name="sameName"
							control={control}
							render={({ field }) => (
								<Checkbox
									size="small"
									checked={field.value}
									onChange={(_, on) => field.onChange(on)}
								/>
							)}
						/>
					}
					label={`Also the ${plural(others, "other row")} named "${row.counterparty}"`}
					slotProps={{ typography: { variant: "caption" } }}
				/>
			)}
		</Stack>
	);
}

/** The "will be" of a row, which you can edit in place: the pencil turns it into a vendor and
 * category pair (Enter saves, Escape cancels). The "also rows named the same" box (on by default) carries the
 * change to the other rows the bank named the same way. */
export default function WillBeCell({
	row,
	accounts,
	vendors,
	categories,
	names,
	onPatch,
}: {
	row: ReviewRow;
	accounts: Map<string, Account>;
	vendors: string[];
	categories: string[];
	names: Map<string, number>;
	onPatch: (index: number, patch: RowPatch, sameName: boolean) => void;
}) {
	const [editing, setEditing] = useState(false);
	if (editing) {
		return (
			<Editor
				row={row}
				vendors={vendors}
				categories={categories}
				others={Math.max(0, (names.get(nameKey(row)) ?? 1) - 1)}
				onCancel={() => setEditing(false)}
				onSave={(patch, sameName) => {
					onPatch(row.index, patch, sameName);
					setEditing(false);
				}}
			/>
		);
	}
	return (
		<Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
			<Typography variant="body2">{destination(row, accounts)}</Typography>
			{row.duplicate !== "reference" && (
				<IconButton
					size="small"
					aria-label={`Edit vendor and category of row ${row.index + 1}`}
					title="Edit vendor and category"
					onClick={() => setEditing(true)}
				>
					<EditOutlinedIcon fontSize="inherit" />
				</IconButton>
			)}
		</Stack>
	);
}
