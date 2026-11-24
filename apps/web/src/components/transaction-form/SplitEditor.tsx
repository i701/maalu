import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { memo, useCallback, useState } from "react";
import Money from "#/components/Money";
import { formatMoney, sumDecimals } from "#/lib/format";
import { type LineAmount, newRow, type SplitRow, type TaxMode } from "#/lib/splits";
import type { Category } from "#/types/api";
import CategoryField from "../CategoryField";
import type { SplitsState } from "./useSplits";

const TAX_MODES: { value: TaxMode; label: string }[] = [
	{ value: "none", label: "No GST" },
	{ value: "included", label: "Prices include GST" },
	{ value: "excluded", label: "Prices exclude GST" },
];

/** A row of the table: on a wide screen one line (item, quantity, price, category, amount, remove);
 * on a narrow one the item and remove button, then quantity, price and amount, then the category. */
const ROW_SX = {
	display: "grid",
	alignItems: "center",
	gap: 1,
	gridTemplateColumns: {
		xs: "72px minmax(0, 1fr) auto",
		md: "minmax(0, 3fr) 76px 112px minmax(0, 2.4fr) 116px 36px",
	},
	gridTemplateAreas: {
		xs: '"item item del" "qty price amount" "cat cat cat"',
		md: '"item qty price cat amount del"',
	},
} as const;

function Heading({
	area,
	label,
	align = "left",
}: {
	area: string;
	label: string;
	align?: "left" | "right";
}) {
	return (
		<Typography
			variant="caption"
			sx={{
				gridArea: area,
				px: 1,
				textAlign: align,
				color: "text.secondary",
				fontWeight: 500,
				letterSpacing: "0.04em",
				textTransform: "uppercase",
			}}
		>
			{label}
		</Typography>
	);
}

/** The column headings, shown where the table is one line per item. */
function Header() {
	return (
		<Box aria-hidden sx={{ ...ROW_SX, display: { xs: "none", md: "grid" }, pb: 0.5 }}>
			<Heading area="item" label="Item" />
			<Heading area="qty" label="Qty" />
			<Heading area="price" label="Price each" />
			<Heading area="cat" label="Category" />
			<Heading area="amount" label="Amount" align="right" />
		</Box>
	);
}

const Row = memo(function Row({
	row,
	index,
	line,
	currency,
	categories,
	canRemove,
	focusItem,
	onChange,
	onRemove,
}: {
	row: SplitRow;
	index: number;
	line: LineAmount | null;
	currency: string;
	categories: Category[];
	canRemove: boolean;
	/** A row just added takes the keyboard, so items can be typed one after another */
	focusItem: boolean;
	onChange: (key: string, changes: Partial<SplitRow>) => void;
	onRemove: (key: string) => void;
}) {
	// Editing quantity or price drops the exact saved total, so it is recalculated.
	const edit = (changes: Partial<SplitRow>) => onChange(row.key, { ...changes, locked: undefined });
	const n = index + 1;
	return (
		<Box
			role="group"
			aria-label={`Item ${n}`}
			sx={{
				...ROW_SX,
				py: { xs: 1, md: 0 },
				// stacked on a phone, a hairline tells where one item ends
				borderTop: {
					xs: index > 0 ? "1px solid var(--md-sys-color-outline-variant)" : "none",
					md: "none",
				},
			}}
		>
			<TextField
				size="small"
				placeholder="Item name"
				value={row.name}
				onChange={(e) => onChange(row.key, { name: e.target.value })}
				autoFocus={focusItem}
				sx={{ gridArea: "item" }}
				slotProps={{ htmlInput: { maxLength: 200, "aria-label": `Item ${n}` } }}
				required
			/>
			<TextField
				size="small"
				placeholder="Qty"
				value={row.quantity}
				onChange={(e) => edit({ quantity: e.target.value })}
				sx={{ gridArea: "qty" }}
				slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `Quantity of item ${n}` } }}
				required
			/>
			<TextField
				size="small"
				placeholder="0.00"
				value={row.price}
				onChange={(e) => edit({ price: e.target.value })}
				sx={{ gridArea: "price" }}
				slotProps={{
					htmlInput: { inputMode: "decimal", "aria-label": `Price each of item ${n}` },
				}}
				required
			/>
			<Box sx={{ gridArea: "cat", minWidth: 0 }}>
				<CategoryField
					categories={categories}
					defaultValue={row.category}
					label={`Category of item ${n}`}
					helper={false}
					dense
					onValueChange={(category) => onChange(row.key, { category })}
				/>
			</Box>
			<Box
				sx={{ gridArea: "amount", textAlign: "right", px: 0.5, fontVariantNumeric: "tabular-nums" }}
				title={line ? undefined : "Enter quantity and price"}
			>
				{line ? (
					<>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{formatMoney(line.amount, currency)}
						</Typography>
						{line.tax && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								GST {formatMoney(line.tax, currency)}
							</Typography>
						)}
					</>
				) : (
					<Typography variant="body2" sx={{ color: "text.disabled" }}>
						–
					</Typography>
				)}
			</Box>
			<IconButton
				aria-label={`Remove item ${n}`}
				onClick={() => onRemove(row.key)}
				disabled={!canRemove}
				size="small"
				sx={{ gridArea: "del", justifySelf: "end" }}
			>
				<DeleteIcon fontSize="small" />
			</IconButton>
		</Box>
	);
});

/** One line of the foot of the table: a label and an amount, right-aligned. */
function TotalLine({
	label,
	amount,
	currency,
	bold = false,
}: {
	label: string;
	amount: string;
	currency: string;
	bold?: boolean;
}) {
	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "space-between",
				gap: 2,
				fontWeight: bold ? 600 : 400,
				fontSize: bold ? 16 : 14,
				color: bold ? "text.primary" : "text.secondary",
				fontVariantNumeric: "tabular-nums",
			}}
		>
			<span>{label}</span>
			<span>
				<Money amount={amount} currency={currency} />
			</span>
		</Box>
	);
}

/** The item-by-item breakdown of a purchase, as a table you edit in place: a row per item with its
 * quantity, price and own category, its amount worked out beside it, and the rows' totals become
 * the transaction's amount. */
export default function SplitEditor({
	splits,
	currency,
	categories,
}: {
	splits: SplitsState;
	currency: string;
	categories: Category[];
}) {
	const { rows, setRows, mode, setMode, rate, setRate, lines, total } = splits;
	const [added, setAdded] = useState<string | null>(null);
	const change = useCallback(
		(key: string, changes: Partial<SplitRow>) =>
			setRows((all) => all.map((r) => (r.key === key ? { ...r, ...changes } : r))),
		[setRows],
	);
	const pickMode = (value: string) => {
		const picked = TAX_MODES.find((m) => m.value === value);
		if (picked) setMode(picked.value);
	};
	const remove = useCallback(
		(key: string) => setRows((all) => all.filter((r) => r.key !== key)),
		[setRows],
	);
	const add = useCallback(() => {
		const row = newRow();
		setAdded(row.key);
		setRows((all) => [...all, row]);
	}, [setRows]);

	// what the rows add up to, split into the part before GST and the GST in it (a row's amount
	// already has its GST in it, whether the typed price included it or not)
	const tax = sumDecimals(lines.flatMap((l) => (l?.tax ? [l.tax] : [])));
	const subtotal = sumDecimals([total, `-${tax}`]);
	const gst = mode !== "none";

	return (
		<Box sx={{ display: "grid", gap: 1.5, pt: 0.5, pb: 2 }}>
			<Box
				sx={{
					p: 1.5,
					display: "grid",
					gap: { xs: 0, md: 1 },
					borderRadius: "var(--shape-md)",
					bgcolor: "var(--md-sys-color-surface-container-low)",
				}}
			>
				<Header />
				{rows.map((row, i) => (
					<Row
						key={row.key}
						row={row}
						index={i}
						line={lines[i]}
						currency={currency}
						categories={categories}
						canRemove={rows.length > 1}
						focusItem={row.key === added}
						onChange={change}
						onRemove={remove}
					/>
				))}
			</Box>

			{/* under the table, right-aligned with its amounts, like the foot of an invoice */}
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 2,
				}}
			>
				<Button startIcon={<AddIcon />} onClick={add}>
					Add item
				</Button>
				<Box
					sx={{
						ml: "auto",
						// the table's panel is padded 12px, so its remove buttons end that far in; the block
						// starts where the form's right-hand column does (the Time field below it): half the
						// width less half the 16px column gap, less that 12px
						mr: { md: 1.5 },
						width: { xs: "100%", md: "calc(50% - 20px)" },
						display: "grid",
						gap: 1,
					}}
				>
					{/* the GST box starts where the labels below it do, and the block ends where the
					    table's remove buttons do */}
					<Box sx={{ display: "flex", gap: 1 }}>
						<TextField
							select
							size="small"
							fullWidth={false}
							label="GST"
							value={mode}
							onChange={(e) => pickMode(e.target.value)}
							sx={{ flex: 1, minWidth: 0 }}
						>
							{TAX_MODES.map((m) => (
								<MenuItem key={m.value} value={m.value}>
									{m.label}
								</MenuItem>
							))}
						</TextField>
						{gst && (
							<TextField
								size="small"
								fullWidth={false}
								label="GST rate (%)"
								value={rate}
								onChange={(e) => setRate(e.target.value)}
								placeholder="8"
								sx={{ width: 120 }}
								slotProps={{ htmlInput: { inputMode: "decimal" } }}
								required
							/>
						)}
					</Box>
					{gst && (
						<>
							<TotalLine label="Subtotal" amount={subtotal} currency={currency} />
							<TotalLine
								label={Number(rate) > 0 ? `GST (${rate.trim()}%)` : "GST"}
								amount={tax}
								currency={currency}
							/>
						</>
					)}
					<TotalLine label="Total" amount={total} currency={currency} bold />
				</Box>
			</Box>
		</Box>
	);
}
