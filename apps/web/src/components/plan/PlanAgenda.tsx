import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { dayLabel, type PlanDay, type PlanRow } from "#/lib/plan";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import TonalChip from "../TonalChip";

/** One bill or planned income: what, from where, how much, what is left after it, and a button to
 * say it happened. */
const Row = memo(function Row({
	row,
	currency,
	onPay,
}: {
	row: PlanRow;
	currency: string;
	onPay: (id: string) => void;
}) {
	const income = row.kind === "income";
	return (
		<Box
			component="li"
			sx={{
				display: "grid",
				gridTemplateColumns: { xs: "minmax(0, 1fr) auto", sm: "minmax(0, 1fr) auto auto" },
				alignItems: "center",
				columnGap: 2,
				rowGap: 0.5,
				py: 1,
			}}
		>
			<Box sx={{ minWidth: 0 }}>
				<Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
					{row.title}
				</Typography>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
					{income && <TonalChip accent={ACCENT.green} label="Expected · not counted" />}
					{row.subscription && <TonalChip accent={ACCENT.violet} label={row.subscription} />}
					{row.account && <TonalChip accent="var(--md-sys-color-outline)" label={row.account} />}
					{row.firstShort && <TonalChip accent={ACCENT.orange} label="Short from here" />}
				</Box>
			</Box>
			<Box sx={{ textAlign: "right" }}>
				<Typography
					sx={{
						fontSize: 14,
						fontWeight: 600,
						fontVariantNumeric: "tabular-nums",
						color: income ? "var(--chart-income)" : "text.primary",
					}}
				>
					{income ? "+" : "−"}
					{formatMoney(row.amount, currency)}
				</Typography>
				{row.left !== null && (
					<Typography
						variant="caption"
						sx={{
							fontVariantNumeric: "tabular-nums",
							color: row.short ? "var(--chart-expense)" : "text.secondary",
						}}
					>
						{formatMoney(row.left, currency)} left
					</Typography>
				)}
			</Box>
			<Button
				size="small"
				variant="outlined"
				color="inherit"
				onClick={() => onPay(row.id)}
				sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, justifySelf: { xs: "start", sm: "end" } }}
			>
				{income ? "Received" : "Mark as paid"}
			</Button>
		</Box>
	);
});

/** The bills by day, overdue first, each with the figure left after it. */
const PlanAgenda = memo(function PlanAgenda({
	days,
	today,
	currency,
	onPay,
}: {
	days: PlanDay[];
	today: string;
	currency: string;
	onPay: (id: string) => void;
}) {
	return (
		<Box sx={{ display: "grid", gap: 2.5 }}>
			{days.map((day) => (
				<Box key={day.key}>
					<Typography
						variant="overline"
						sx={{
							letterSpacing: 0.6,
							color: day.overdue ? "var(--md-sys-color-error)" : "text.secondary",
						}}
					>
						{dayLabel(day, today)}
					</Typography>
					<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
						{day.rows.map((row) => (
							<Row key={row.id} row={row} currency={currency} onPay={onPay} />
						))}
					</Box>
				</Box>
			))}
		</Box>
	);
});

export default PlanAgenda;
