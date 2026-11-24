import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import BudgetAlert from "#/components/BudgetAlert";
import BalanceTrendCard from "#/components/dashboard/BalanceTrendCard";
import BudgetGoalsCard from "#/components/dashboard/BudgetGoalsCard";
import CreditUsageCard from "#/components/dashboard/CreditUsageCard";
import LatestTransactionsCard from "#/components/dashboard/LatestTransactionsCard";
import MoneyFlowCard from "#/components/dashboard/MoneyFlowCard";
import MonthlyCard from "#/components/dashboard/MonthlyCard";
import NeedsWantsCard from "#/components/dashboard/NeedsWantsCard";
import SectionGrid, { type Section } from "#/components/dashboard/SectionGrid";
import SpendingCard from "#/components/dashboard/SpendingCard";
import SummaryCard from "#/components/dashboard/SummaryCard";
import UpcomingSoonCard from "#/components/dashboard/UpcomingSoonCard";
import PageHeader from "#/components/PageHeader";
import PageSkeleton from "#/components/PageSkeleton";
import PendingOverlay from "#/components/PendingOverlay";
import MonthPicker from "#/components/MonthPicker";
import IconSymbol from "#/components/Symbol";
import { creditUsage } from "#/lib/accounts";
import { CardMorph } from "#/lib/card-morph";
import { useHiddenSections } from "#/lib/dashboard-hidden";
import {
	DEFAULT_SECTION_ORDER,
	monthBounds,
	monthLabel,
	orderSections,
	shiftMonth,
} from "#/lib/dashboard";
import { sumDecimals } from "#/lib/format";
import { localToday } from "#/lib/planned";
import { unwrap } from "#/lib/unwrap";
import { useAction } from "#/lib/use-action";
import { listAccountsFn } from "#/server/accounts";
import { getMeFn, updateMeFn } from "#/server/auth";
import { getBudgetFn } from "#/server/budget";
import { listGoalsFn } from "#/server/goals";
import { getAvailableToSpendFn, getBalanceTrendFn, getMonthlyStatsFn } from "#/server/stats";
import {
	getCategoryTotalsFn,
	getTransactionTotalsFn,
	listTransactionsFn,
	listUpcomingWithinSetting,
} from "#/server/transactions";

const searchSchema = z.object({
	// Any day in the month to show; leave it out for the current month.
	on: z.iso.date().optional().catch(undefined),
});

const today = () => {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const Route = createFileRoute("/_protected/dashboard")({
	// Slow loads show the page's shape; quick ones never flash it.
	pendingComponent: PageSkeleton,
	pendingMs: 500,
	pendingMinMs: 300,
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const now = today();
		const current = monthBounds(deps.on ?? now);
		const previous = monthBounds(shiftMonth(current.start, -1));
		// A month that has not ended yet is shown up to today, so the line doesn't run flat.
		const trendEnd = current.end > now && current.start <= now ? now : current.end;
		const range = { date_from: current.start, date_to: current.end };

		// one /users/me request, shared with the upcoming list, which needs the days setting
		const mePromise = getMeFn();
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
			me,
		] = await Promise.all([
			getTransactionTotalsFn({ data: range }),
			getTransactionTotalsFn({
				data: { date_from: previous.start, date_to: previous.end },
			}),
			getCategoryTotalsFn({ data: range }),
			getMonthlyStatsFn({ data: { months: 12, to: current.end } }),
			getBalanceTrendFn({ data: { from: current.start, to: trendEnd } }),
			listTransactionsFn({ data: { page: 1, pageSize: 10 } }),
			getBudgetFn({ data: {} }),
			listGoalsFn({ data: {} }),
			listAccountsFn(),
			getAvailableToSpendFn(),
			listUpcomingWithinSetting(mePromise),
			mePromise,
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
			// the user's own order of the sections (null is the default one)
			savedOrder: unwrap(me).dashboard_order,
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
		savedOrder,
	} = Route.useLoaderData();
	const { run, pending } = useAction();
	const [editing, setEditing] = useState(false);
	// the order being arranged; saved once, when the user is done
	const [draft, setDraft] = useState<string[] | null>(null);
	// sections turned off on this device (local, not the account); the draft is saved on Done
	const [hidden, saveHidden] = useHiddenSections();
	const [draftHidden, setDraftHidden] = useState<ReadonlySet<string>>(new Set());
	const navigate = Route.useNavigate();
	const goTo = (on: string | undefined) => navigate({ search: { on }, replace: true });
	const label = monthLabel(month);
	const previousLabel = monthLabel(shiftMonth(month, -1));
	const isCurrent = month === monthBounds(today()).start;

	const saved = sumDecimals([totals.income, `-${totals.expense}`]);

	const sections: Section[] = [
		{
			// the id of the old "Income, spent and saved" section, so a saved order keeps its place
			id: "metrics",
			label: "Summary",
			span: 6,
			node: (
				<SummaryCard
					available={available}
					kept={saved}
					totals={totals}
					before={before}
					months={monthly.months}
					previousLabel={previousLabel}
				/>
			),
		},
		{
			id: "spending",
			label: "Spending by category",
			span: 2,
			node: <SpendingCard categories={categories} period={label} />,
		},
		{
			id: "balance",
			label: "Net worth",
			span: 4,
			node: <BalanceTrendCard trend={trend} against={monthLabel(month, true)} />,
		},
		{
			id: "monthly",
			label: "Cash flow",
			span: 4,
			node: <MonthlyCard stats={monthly} />,
		},
		{
			id: "budget",
			label: "Budget and goals",
			span: 2,
			node: <BudgetGoalsCard budget={budget} goals={goals} />,
		},
		{
			id: "needs-wants",
			label: "Needs and wants",
			span: 6,
			node: <NeedsWantsCard categories={categories} period={label} />,
		},
		{
			id: "money-flow",
			label: "Money flow",
			span: 6,
			node: <MoneyFlowCard categories={categories} period={label} />,
		},
		...(creditAccounts.length > 0
			? [
					{
						id: "credit",
						label: "Credit used",
						span: 6,
						node: <CreditUsageCard accounts={creditAccounts} />,
					},
				]
			: []),
		{
			id: "upcoming",
			label: "Coming up",
			span: 3,
			node: <UpcomingSoonCard upcoming={upcoming} today={asOf} />,
		},
		{
			id: "latest",
			label: "Latest transactions",
			span: 3,
			node: <LatestTransactionsCard transactions={latest} />,
		},
	];
	const byId = new Map(sections.map((section) => [section.id, section]));
	const ordered = orderSections(
		(editing ? draft : savedOrder) ?? DEFAULT_SECTION_ORDER,
		sections.map((section) => section.id),
	).flatMap((id) => byId.get(id) ?? []);

	const shown = editing ? ordered : ordered.filter((section) => !hidden.has(section.id));

	function toggleHidden(id: string) {
		const next = new Set(draftHidden);
		if (!next.delete(id)) next.add(id);
		setDraftHidden(next);
	}

	function startEditing() {
		setDraft(ordered.map((section) => section.id));
		setDraftHidden(hidden);
		setEditing(true);
	}

	async function finishEditing() {
		// a failed save keeps the page in arranging mode, with the error shown by useAction's owner
		if (!(await run(() => updateMeFn({ data: { dashboard_order: draft } })))) return;
		saveHidden(draftHidden);
		setEditing(false);
	}

	return (
		<CardMorph direction="up">
			<PageHeader
				title="Dashboard"
				symbol="grid_view"
				accent="blue"
				shape={4}
				description="Your money this month: what came in, what went out, and what is left to spend."
				action={
					<MonthPicker month={month} isCurrent={isCurrent} onChange={goTo}>
						<IconButton
							color="inherit"
							size="small"
							aria-label="Arrange the dashboard"
							aria-pressed={editing}
							disabled={editing}
							onClick={startEditing}
						>
							<IconSymbol name="tune" size={22} />
						</IconButton>
					</MonthPicker>
				}
			/>

			<BudgetAlert budget={budget} />

			{editing && (
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
					<Typography variant="body2" color="text.secondary">
						Drag the cards by their handle, or use the arrows, to put them in the order you like.
						The eye turns a card off on this device.
					</Typography>
					<Box sx={{ display: "flex", gap: 1 }}>
						<Button
							color="inherit"
							size="small"
							disabled={pending}
							onClick={() => {
								setDraft(null);
								setDraftHidden(new Set());
							}}
						>
							Reset
						</Button>
						<Button variant="contained" size="small" disabled={pending} onClick={finishEditing}>
							Done
						</Button>
					</Box>
				</Box>
			)}

			<PendingOverlay>
				{shown.length === 0 ? (
					<Typography color="text.secondary">
						Every card is turned off. Use the tune button to bring some back.
					</Typography>
				) : (
					<SectionGrid
						sections={shown}
						editing={editing}
						hidden={draftHidden}
						onReorder={setDraft}
						onToggleHidden={toggleHidden}
					/>
				)}
			</PendingOverlay>
		</CardMorph>
	);
}
