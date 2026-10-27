import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { memo, useCallback } from "react";
import { formatMoney } from "#/lib/format";
import { newRow, type LineAmount, type SplitRow, type TaxMode } from "#/lib/splits";
import type { SplitsState } from "./useSplits";

const TAX_MODES: { value: TaxMode; label: string }[] = [
	{ value: "none", label: "No GST" },
	{ value: "included", label: "Prices include GST" },
	{ value: "excluded", label: "Prices exclude GST" },
];

const Row = memo(function Row({
	row,
	line,
	currency,
	canRemove,
	onChange,
	onRemove,
}: {
	row: SplitRow;
	line: LineAmount | null;
	currency: string;
	canRemove: boolean;
	onChange: (key: string, changes: Partial<SplitRow>) => void;
	onRemove: (key: string) => void;
}) {
	// Editing quantity or price drops the exact saved total, so it is recalculated.
	const edit = (changes: Partial<SplitRow>) => onChange(row.key, { ...changes, locked: undefined });
	return (
		<Box
			sx={{
				p: 1.5,
				borderRadius: "var(--shape-md)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Grid container spacing={1.5} sx={{ alignItems: "center" }}>
				<Grid size={{ xs: 10, sm: 11 }}>
					<TextField
						label="Item"
						value={row.name}
						onChange={(e) => onChange(row.key, { name: e.target.value })}
						slotProps={{ htmlInput: { maxLength: 200 } }}
						required
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: "right" }}>
					<IconButton
						aria-label="Remove item"
						onClick={() => onRemove(row.key)}
						disabled={!canRemove}
						size="small"
					>
						<DeleteIcon fontSize="small" />
					</IconButton>
				</Grid>
				<Grid size={{ xs: 4, sm: 2 }}>
					<TextField
						label="Qty"
						value={row.quantity}
						onChange={(e) => edit({ quantity: e.target.value })}
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
						required
					/>
				</Grid>
				<Grid size={{ xs: 8, sm: 4 }}>
					<TextField
						label="Price each"
						value={row.price}
						onChange={(e) => edit({ price: e.target.value })}
						placeholder="0.00"
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
						required
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Category"
						value={row.category}
						onChange={(e) => onChange(row.key, { category: e.target.value })}
						slotProps={{ htmlInput: { maxLength: 100 } }}
						required
					/>
				</Grid>
			</Grid>
			<Typography
				variant="caption"
				sx={{ display: "block", mt: 0.75, textAlign: "right", color: "text.secondary" }}
			>
				{line
					? `${formatMoney(line.amount, currency)}${line.tax ? ` (GST ${formatMoney(line.tax, currency)})` : ""}`
					: "Enter quantity and price"}
			</Typography>
		</Box>
	);
});

/** The item-by-item breakdown of a purchase: each row has a quantity, a price and its own category,
 * and the rows' totals become the transaction's amount. */
export default function SplitEditor({
	splits,
	currency,
}: {
	splits: SplitsState;
	currency: string;
}) {
	const { rows, setRows, mode, setMode, rate, setRate, lines, total } = splits;
	const change = useCallback(
		(key: string, changes: Partial<SplitRow>) =>
			setRows((all) => all.map((r) => (r.key === key ? { ...r, ...changes } : r))),
		[setRows],
	);
	const remove = useCallback(
		(key: string) => setRows((all) => all.filter((r) => r.key !== key)),
		[setRows],
	);
	const add = useCallback(() => setRows((all) => [...all, newRow()]), [setRows]);

	return (
		<Box sx={{ display: "grid", gap: 1.5, pb: 2 }}>
			<Grid container spacing={1.5}>
				<Grid size={{ xs: 12, sm: mode === "none" ? 12 : 8 }}>
					<TextField
						select
						label="GST"
						value={mode}
						onChange={(e) => setMode(e.target.value as TaxMode)}
					>
						{TAX_MODES.map((m) => (
							<MenuItem key={m.value} value={m.value}>
								{m.label}
							</MenuItem>
						))}
					</TextField>
				</Grid>
				{mode !== "none" && (
					<Grid size={{ xs: 12, sm: 4 }}>
						<TextField
							label="GST rate (%)"
							value={rate}
							onChange={(e) => setRate(e.target.value)}
							placeholder="8"
							slotProps={{ htmlInput: { inputMode: "decimal" } }}
							required
						/>
					</Grid>
				)}
			</Grid>

			{rows.map((row, i) => (
				<Row
					key={row.key}
					row={row}
					line={lines[i]}
					currency={currency}
					canRemove={rows.length > 1}
					onChange={change}
					onRemove={remove}
				/>
			))}

			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<Button startIcon={<AddIcon />} onClick={add}>
					Add item
				</Button>
				<Typography sx={{ fontWeight: 600 }}>Total {formatMoney(total, currency)}</Typography>
			</Box>
		</Box>
	);
}
