import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import BudgetAlert from "#/components/BudgetAlert";
import AvailableCard from "#/components/dashboard/AvailableCard";
import BalanceTrendCard from "#/components/dashboard/BalanceTrendCard";
import BudgetGoalsCard from "#/components/dashboard/BudgetGoalsCard";
import CreditUsageCard from "#/components/dashboard/CreditUsageCard";
import DeltaBadge from "#/components/dashboard/DeltaBadge";
import LatestTransactionsCard from "#/components/dashboard/LatestTransactionsCard";
import { CardMorph } from "#/lib/card-morph";
import MetricCard from "#/components/dashboard/MetricCard";
import MetricStrip from "#/components/dashboard/MetricStrip";
import MoneyFlowCard from "#/components/dashboard/MoneyFlowCard";
import MonthlyCard from "#/components/dashboard/MonthlyCard";
import NeedsWantsCard from "#/components/dashboard/NeedsWantsCard";
import UpcomingSoonCard from "#/components/dashboard/UpcomingSoonCard";
import SpendingCard from "#/components/dashboard/SpendingCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import Symbol from "#/components/Symbol";
import { monthBounds, monthLabel, percentChange, shiftMonth } from "#/lib/dashboard";
import { formatMoney, formatMoneyCompact, sumDecimals, formatMoneyFull } from "#/lib/format";
import { staggerChildren } from "#/lib/motion";
import { localToday } from "#/lib/planned";
import { unwrap } from "#/lib/unwrap";
import { creditUsage } from "#/lib/accounts";
import { listAccountsFn } from "#/server/accounts";
import { getBudgetFn } from "#/server/budget";
import { listGoalsFn } from "#/server/goals";
import { getAvailableToSpendFn, getBalanceTrendFn, getMonthlyStatsFn } from "#/server/stats";
import {
	getCategoryTotalsFn,
	getTransactionTotalsFn,
	listTransactionsFn,
	listUpcomingFn,
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

		const [
			totals,
			before,
			categories,
			monthly,
			trend,
			latest,
			budget,
			goals,
			accounts,
			available,
			upcoming,
		] = await Promise.all([
			getTransactionTotalsFn({ data: range }),
			getTransactionTotalsFn({ data: { date_from: previous.start, date_to: previous.end } }),
			getCategoryTotalsFn({ data: range }),
			getMonthlyStatsFn({ data: { months: 12, to: current.end } }),
			getBalanceTrendFn({ data: { from: current.start, to: trendEnd } }),
			listTransactionsFn({ data: { page: 1, pageSize: 10 } }),
			getBudgetFn({ data: {} }),
			listGoalsFn({ data: {} }),
			listAccountsFn(),
			getAvailableToSpendFn(),
			listUpcomingFn(),
		]);
		return {
			month: current.start,
			totals: unwrap(totals),
			before: unwrap(before),
			categories: unwrap(categories),
			monthly: unwrap(monthly),
			trend: unwrap(trend),
			latest: unwrap(latest).items.slice(0, 5),
			// planned bills and income, soonest first (the page works without them)
			upcoming: upcoming.ok ? upcoming.data : [],
			asOf: localToday(),
			// the page works without these two
			available: available.ok ? available.data : null,
			budget: budget.ok ? budget.data : null,
			goals: goals.ok ? goals.data : [],
			// cards and overdrafts with a credit limit (the page works without them)
			creditAccounts: accounts.ok
				? accounts.data.filter((a) => !a.exclude_from_stats && creditUsage(a))
				: [],
		};
	},
	component: DashboardPage,
});

function DashboardPage() {
	const {
		month,
		totals,
		before,
		categories,
		monthly,
		trend,
		latest,
		budget,
		goals,
		creditAccounts,
		available,
		upcoming,
		asOf,
	} = Route.useLoaderData();
	const navigate = Route.useNavigate();
	const goTo = (on: string | undefined) => navigate({ search: { on }, replace: true });
	const label = monthLabel(month);
	const previousLabel = monthLabel(shiftMonth(month, -1));
	const currency = totals.currency;
	const isCurrent = month === monthBounds(today()).start;

	const saved = sumDecimals([totals.income, `-${totals.expense}`]);
	const savedBefore = sumDecimals([before.income, `-${before.expense}`]);

	return (
		<CardMorph direction="up">
			<PageHeader
				title="Dashboard"
				symbol="grid_view"
				accent="blue"
				shape={4}
				plainIcon
				morph="up"
				description="Your money this month: what came in, what went out, and what is left to spend."
				action={
					// the month picker lives in the banner; its controls take the banner's white
					<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#fff" }}>
						<IconButton
							color="inherit"
							size="small"
							aria-label="Previous month"
							onClick={() => goTo(shiftMonth(month, -1))}
						>
							<Symbol name="chevron_left" size={22} />
						</IconButton>
						<Typography
							sx={{
								fontWeight: 500,
								minWidth: { xs: 112, sm: 150 },
								textAlign: "center",
								fontSize: { xs: 14, sm: 16 },
							}}
							aria-live="polite"
						>
							{label}
						</Typography>
						<IconButton
							color="inherit"
							size="small"
							aria-label="Next month"
							onClick={() => goTo(shiftMonth(month, 1))}
						>
							<Symbol name="chevron_right" size={22} />
						</IconButton>
						{!isCurrent && (
							<Button color="inherit" size="small" onClick={() => goTo(undefined)}>
								This month
							</Button>
						)}
					</Box>
				}
			/>

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
					{available && (
						<Box sx={cell(6)}>
							<AvailableCard data={available} />
						</Box>
					)}
					{/* On a phone the three tiles are one strip (the tiles are for wider screens). */}
					<Box sx={{ display: { xs: "block", sm: "none" } }}>
						<MetricStrip
							against={previousLabel}
							items={[
								{
									label: "Income",
									value: formatMoneyCompact(totals.income, currency),
									full: formatMoneyFull(totals.income, currency),
									percent: percentChange(totals.income, before.income),
									goodWhenUp: true,
								},
								{
									label: "Spent",
									value: formatMoneyCompact(totals.expense, currency),
									full: formatMoneyFull(totals.expense, currency),
									percent: percentChange(totals.expense, before.expense),
									goodWhenUp: false,
								},
								{
									label: Number(saved) >= 0 ? "Saved" : "Overspent",
									value: formatMoneyCompact(saved, currency),
									full: formatMoneyFull(saved, currency),
									percent: percentChange(saved, savedBefore),
									goodWhenUp: true,
								},
							]}
						/>
					</Box>
					<Box sx={{ ...cell(2), display: { xs: "none", sm: "block" } }}>
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
					<Box sx={{ ...cell(2), display: { xs: "none", sm: "block" } }}>
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
					<Box sx={{ ...cell(2), display: { xs: "none", sm: "block" } }}>
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
						<NeedsWantsCard categories={categories} period={label} />
					</Box>

					<Box sx={cell(6)}>
						<MoneyFlowCard categories={categories} period={label} />
					</Box>

					{creditAccounts.length > 0 && (
						<Box sx={cell(6)}>
							<CreditUsageCard accounts={creditAccounts} />
						</Box>
					)}

					<Box sx={cell(3)}>
						<UpcomingSoonCard upcoming={upcoming} today={asOf} />
					</Box>
					<Box sx={cell(3)}>
						<LatestTransactionsCard transactions={latest} />
					</Box>
				</Box>
			</PendingOverlay>
		</CardMorph>
	);
}
