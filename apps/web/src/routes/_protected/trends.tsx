import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import ChartCard from "#/components/charts/ChartCard";
import Legend from "#/components/charts/Legend";
import StackedColumns from "#/components/charts/StackedColumns";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import KindMonthsTable from "#/components/trends/KindMonthsTable";
import TrendsTable from "#/components/trends/TrendsTable";
import { kindMonths } from "#/lib/needs-wants";
import { ACCENT_NAMES, categoryAccent } from "#/lib/categories";
import { formatMoney } from "#/lib/format";
import { localToday } from "#/lib/planned";
import {
	distinctAccents,
	monthColumn,
	monthTitle,
	stackSeries,
	TREND_RANGES,
	trendBounds,
} from "#/lib/trends";
import { unwrap } from "#/lib/unwrap";
import { getCategoryMonthsFn } from "#/server/transactions";

const searchSchema = z.object({
	months: z
		.union(
			TREND_RANGES.map((n) => z.literal(n)) as [
				z.ZodLiteral<6>,
				z.ZodLiteral<12>,
				z.ZodLiteral<24>,
			],
		)
		.optional()
		.catch(undefined),
	kind: z.enum(["expense", "income"]).optional().catch(undefined),
	view: z.enum(["table", "chart"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/trends")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ months: search.months ?? 12 }),
	loader: async ({ deps }) =>
		unwrap(await getCategoryMonthsFn({ data: trendBounds(deps.months, localToday()) })),
	component: TrendsPage,
});

const KINDS = {
	expense: { label: "Spending", color: "var(--chart-expense)" },
	income: { label: "Income", color: "var(--chart-income)" },
} as const;

function TrendsPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const kind = search.kind ?? "expense";
	const months = search.months ?? 12;
	const view = search.view ?? "table";
	const rows = useMemo(() => data.categories.filter((c) => c.type === kind), [data, kind]);
	const stack = useMemo(() => {
		const series = stackSeries(rows);
		// categories can share an accent; in a stack every segment needs its own
		const accents = distinctAccents(series, ACCENT_NAMES);
		return series.map((s, i) => ({
			...s,
			color: accents[i] === null ? "var(--md-sys-color-outline)" : categoryAccent(accents[i]),
		}));
	}, [rows]);
	const kinds = useMemo(
		() => (kind === "expense" ? kindMonths(data.categories, data.months.length) : []),
		[data, kind],
	);
	const labels = useMemo(() => data.months.map(monthColumn), [data.months]);
	const titles = useMemo(() => data.months.map(monthTitle), [data.months]);

	return (
		<>
			<PageHeader
				title="Trends"
				symbol="calendar_month"
				accent="lime"
				shape={2}
				description="Every category, month by month. The darker a figure, the bigger it is compared with the rest of the table."
			/>

			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
				<ToggleButtonGroup
					exclusive
					size="small"
					value={kind}
					onChange={(_, value: "expense" | "income" | null) =>
						value && void navigate({ search: (prev) => ({ ...prev, kind: value }), replace: true })
					}
					aria-label="What to show"
				>
					{(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k) => (
						<ToggleButton key={k} value={k} sx={{ px: 1.5, py: 0.5 }}>
							{KINDS[k].label}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				<ToggleButtonGroup
					exclusive
					size="small"
					value={view}
					onChange={(_, value: "table" | "chart" | null) =>
						value && void navigate({ search: (prev) => ({ ...prev, view: value }), replace: true })
					}
					aria-label="How to show it"
				>
					<ToggleButton value="table" sx={{ px: 1.5, py: 0.5 }}>
						Table
					</ToggleButton>
					<ToggleButton value="chart" sx={{ px: 1.5, py: 0.5 }}>
						Chart
					</ToggleButton>
				</ToggleButtonGroup>
				<ToggleButtonGroup
					exclusive
					size="small"
					value={months}
					onChange={(_, value: 6 | 12 | 24 | null) =>
						value &&
						void navigate({ search: (prev) => ({ ...prev, months: value }), replace: true })
					}
					aria-label="How many months"
				>
					{TREND_RANGES.map((n) => (
						<ToggleButton key={n} value={n} sx={{ px: 1.5, py: 0.5 }}>
							{n} months
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			</Box>

			<PendingOverlay>
				{rows.length === 0 ? (
					<EmptyState symbol="calendar_month" accent="lime" shape={2}>
						No {KINDS[kind].label.toLowerCase()} in these {months} months.
					</EmptyState>
				) : (
					<>
						{view === "chart" ? (
							<ChartCard
								title={`${KINDS[kind].label} by month`}
								subtitle="The biggest categories stacked; the rest are in Other. Refunds are not drawn, the table has them."
								legend={
									<Legend
										items={[...stack].toReversed().map((s) => ({ name: s.name, color: s.color }))}
									/>
								}
							>
								<StackedColumns
									labels={labels}
									titles={titles}
									series={stack}
									formatValue={(v) => formatMoney(String(v), data.currency)}
									ariaLabel={`${KINDS[kind].label} by month, stacked by category`}
								/>
							</ChartCard>
						) : (
							<TrendsTable
								rows={rows}
								months={data.months}
								currency={data.currency}
								color={KINDS[kind].color}
								label={`${KINDS[kind].label} by category and month`}
							/>
						)}
						{view === "table" && kinds.length > 0 && (
							<Box sx={{ mt: 2 }}>
								<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
									Needs and wants
								</Typography>
								<KindMonthsTable rows={kinds} months={data.months} />
							</Box>
						)}
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
							In {data.currency}. Transfers and balance adjustments are not counted, and refunds
							take away from spending in the month they arrive.
						</Typography>
					</>
				)}
			</PendingOverlay>
		</>
	);
}
