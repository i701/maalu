import ButtonBase from "@mui/material/ButtonBase";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { memo, useMemo, useState } from "react";
import { formatMoney } from "#/lib/format";
import { MORPH_TRANSITION, morph } from "#/lib/shape";
import { coloredStack, lastMonths, monthColumn, monthTitle } from "#/lib/trends";
import type { CategoryMonths } from "#/types/api";
import ChartCard from "../charts/ChartCard";
import StackedColumns from "../charts/StackedColumns";
import Figure from "../Figure";

const COUNTS = [6, 12] as const;
type Count = (typeof COUNTS)[number];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** The biggest categories drawn; everything else is folded into "Other". */
const TOP = 4;

/** One category of the stack as a chip: its colour, its name and what it came to. Pressing it
 * follows that category through the months (the others fade), pressing it again lets go. */
function SeriesChip({
	name,
	color,
	value,
	on,
	onClick,
}: {
	name: string;
	color: string;
	value: string;
	on: boolean;
	onClick: () => void;
}) {
	return (
		<ButtonBase
			onClick={onClick}
			aria-pressed={on}
			focusRipple
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.75,
				height: 32,
				px: 1.5,
				fontSize: 13,
				fontWeight: 500,
				...morph("16px"),
				transition: `${MORPH_TRANSITION}, background-color var(--spring-effects-default-dur) var(--spring-effects-default)`,
				bgcolor: on
					? `color-mix(in oklab, ${color} 22%, var(--md-sys-color-surface-container-low))`
					: "transparent",
				boxShadow: on ? "none" : "inset 0 0 0 1px var(--md-sys-color-outline-variant)",
				color: "var(--md-sys-color-on-surface)",
			}}
		>
			<Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: color }} />
			<span>{name}</span>
			<Box component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
				{value}
			</Box>
		</ButtonBase>
	);
}

/**
 * Spending month by month, stacked by the biggest categories (the rest in "Other"): the figure for
 * the span, 6 or 12 months of columns, and a chip for each category. Hover a column for its month;
 * press a chip to follow one category through them, and the figure becomes that category's.
 */
const SpendingTrendCard = memo(function SpendingTrendCard({ data }: { data: CategoryMonths }) {
	const [count, setCount] = useState<Count>(6);
	const [held, setHeld] = useState<string | null>(null);
	const span = useMemo(() => lastMonths(data, count), [data, count]);
	const stack = useMemo(
		() =>
			coloredStack(
				span.categories.filter((c) => c.type === "expense"),
				TOP,
			),
		[span],
	);
	const labels = useMemo(() => span.months.map(monthColumn), [span.months]);
	const titles = useMemo(() => span.months.map(monthTitle), [span.months]);
	const money = (v: number) => formatMoney(String(v), span.currency);
	const followed = stack.find((s) => s.name === held);
	const amount = sum((followed ? [followed] : stack).flatMap((s) => s.values));
	const table = useMemo(
		() => ({
			head: ["Month", "Spent"],
			rows: titles.map((title, i) => [
				title,
				formatMoney(String(stack.reduce((total, s) => total + s.values[i], 0)), span.currency),
			]),
		}),
		[titles, stack, span.currency],
	);

	return (
		<ChartCard
			title="Spending by month"
			subtitle={`${followed ? `${followed.name} · ` : ""}Last ${span.months.length} months`}
			table={table}
			actions={
				<ToggleButtonGroup
					exclusive
					size="small"
					value={count}
					onChange={(_, next: Count | null) => {
						if (!next) return;
						setCount(next);
						setHeld(null);
					}}
					aria-label="Months shown"
				>
					{COUNTS.map((c) => (
						<ToggleButton key={c} value={c} sx={{ px: 1.25, py: 0.25 }}>
							{c} mo
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			}
			legend={
				<Typography
					component="p"
					aria-live="polite"
					sx={{ fontSize: { xs: 28, sm: 34 }, lineHeight: 1.15 }}
				>
					<Figure>{money(amount)}</Figure>
				</Typography>
			}
		>
			<StackedColumns
				labels={labels}
				titles={titles}
				series={stack}
				formatValue={money}
				ariaLabel={`Spending by month for the last ${span.months.length} months, stacked by category`}
				height={200}
				highlight={followed?.name ?? null}
			/>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
				{stack.map((s) => (
					<SeriesChip
						key={s.name}
						name={s.name}
						color={s.color}
						value={money(sum(s.values))}
						on={held === s.name}
						onClick={() => setHeld(held === s.name ? null : s.name)}
					/>
				))}
			</Box>
		</ChartCard>
	);
});

export default SpendingTrendCard;
