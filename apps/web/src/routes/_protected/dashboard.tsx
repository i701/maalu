import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import BudgetAlert from "#/components/BudgetAlert";
import BalanceTrendCard from "#/components/dashboard/BalanceTrendCard";
import BudgetGoalsCard from "#/components/dashboard/BudgetGoalsCard";
import DeltaBadge from "#/components/dashboard/DeltaBadge";
import LatestTransactionsCard from "#/components/dashboard/LatestTransactionsCard";
import MetricCard from "#/components/dashboard/MetricCard";
import MonthlyCard from "#/components/dashboard/MonthlyCard";
import SpendingCard from "#/components/dashboard/SpendingCard";
import PendingOverlay from "#/components/PendingOverlay";
import Symbol from "#/components/Symbol";
import { monthBounds, monthLabel, percentChange, shiftMonth } from "#/lib/dashboard";
import { formatMoney, sumDecimals } from "#/lib/format";
import { staggerChildren } from "#/lib/motion";
import { unwrap } from "#/lib/unwrap";
import { getBudgetFn } from "#/server/budget";
import { listGoalsFn } from "#/server/goals";
import { getMonthlyStatsFn, getBalanceTrendFn } from "#/server/stats";
import {
	getCategoryTotalsFn,
	getTransactionTotalsFn,
	listTransactionsFn,
} from "#/server/transactions";

const searchSchema = z.object({
	// Any day in the month to show; leave it out for the current month.
	on: z.iso.date().optional().catch(undefined),
});

/** A grid cell spanning `n` of 6 columns on wide screens (narrow ones stack); its card fills the row. */
const cell = (n: number) => ({ gridColumn: { lg: `span ${n}` }, "& > *": { height: "100%" } });

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const Route = createFileRoute("/_protected/dashboard")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const now = today();
		const current = monthBounds(deps.on ?? now);
		const previous = monthBounds(shiftMonth(current.start, -1));
		// A month that has not ended yet is shown up to today, so the line doesn't run flat.
		const trendEnd = current.end > now && current.start <= now ? now : current.end;
		const range = { date_from: current.start, date_to: current.end };

		const [totals, before, categories, monthly, trend, latest, budget, goals] = await Promise.all([
			getTransactionTotalsFn({ data: range }),
			getTransactionTotalsFn({ data: { date_from: previous.start, date_to: previous.end } }),
			getCategoryTotalsFn({ data: range }),
			getMonthlyStatsFn({ data: { months: 6, to: current.end } }),
			getBalanceTrendFn({ data: { from: current.start, to: trendEnd } }),
			listTransactionsFn({ data: { page: 1, pageSize: 10 } }),
			getBudgetFn({ data: {} }),
			listGoalsFn({ data: {} }),
		]);
		return {
			month: current.start,
			totals: unwrap(totals),
			before: unwrap(before),
			categories: unwrap(categories),
			monthly: unwrap(monthly),
			trend: unwrap(trend),
			latest: unwrap(latest).items.slice(0, 5),
			// the page works without these two
			budget: budget.ok ? budget.data : null,
			goals: goals.ok ? goals.data : [],
		};
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { month, totals, before, categories, monthly, trend, latest, budget, goals } =
		Route.useLoaderData();
	const navigate = Route.useNavigate();
	const goTo = (on: string | undefined) => navigate({ search: { on }, replace: true });
	const label = monthLabel(month);
	const previousLabel = monthLabel(shiftMonth(month, -1));
	const currency = totals.currency;
	const isCurrent = month === monthBounds(today()).start;

	const saved = sumDecimals([totals.income, `-${totals.expense}`]);
	const savedBefore = sumDecimals([before.income, `-${before.expense}`]);

	return (
		<>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 1,
					flexWrap: "wrap",
					mb: 2,
				}}
			>
				<Typography variant="h1" sx={{ fontSize: 28, fontWeight: 600 }}>
					Dashboard
				</Typography>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<IconButton aria-label="Previous month" onClick={() => goTo(shiftMonth(month, -1))}>
						<Symbol name="chevron_left" size={24} />
					</IconButton>
					<Typography
						sx={{ fontWeight: 500, minWidth: 150, textAlign: "center" }}
						aria-live="polite"
					>
						{label}
					</Typography>
					<IconButton aria-label="Next month" onClick={() => goTo(shiftMonth(month, 1))}>
						<Symbol name="chevron_right" size={24} />
					</IconButton>
					{!isCurrent && (
						<Button color="inherit" onClick={() => goTo(undefined)}>
							This month
						</Button>
					)}
				</Box>
			</Box>

			<BudgetAlert budget={budget} />

			<PendingOverlay>
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(6, minmax(0, 1fr))" },
						...staggerChildren(),
					}}
				>
					<Box sx={cell(2)}>
						<MetricCard
							label={`Income in ${label}`}
							value={formatMoney(totals.income, currency)}
							badge={
								<DeltaBadge
									percent={percentChange(totals.income, before.income)}
									goodWhenUp
									against={previousLabel}
								/>
							}
						/>
					</Box>
					<Box sx={cell(2)}>
						<MetricCard
							label={`Spent in ${label}`}
							value={formatMoney(totals.expense, currency)}
							badge={
								<DeltaBadge
									percent={percentChange(totals.expense, before.expense)}
									goodWhenUp={false}
									against={previousLabel}
								/>
							}
						/>
					</Box>
					<Box sx={cell(2)}>
						<MetricCard
							label={Number(saved) >= 0 ? "Saved this month" : "Overspent this month"}
							value={formatMoney(saved, currency)}
							badge={
								<DeltaBadge
									percent={percentChange(saved, savedBefore)}
									goodWhenUp
									against={previousLabel}
								/>
							}
						/>
					</Box>

					<Box sx={cell(4)}>
						<BalanceTrendCard trend={trend} against={monthLabel(month, true)} />
					</Box>
					<Box sx={cell(2)}>
						<SpendingCard categories={categories} period={label} />
					</Box>

					<Box sx={cell(4)}>
						<MonthlyCard stats={monthly} />
					</Box>
					<Box sx={cell(2)}>
						<BudgetGoalsCard budget={budget} goals={goals} />
					</Box>

					<Box sx={cell(6)}>
						<LatestTransactionsCard transactions={latest} />
					</Box>
				</Box>
			</PendingOverlay>
		</>
	);
}
