import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import ChartCard from "#/components/charts/ChartCard";
import Legend from "#/components/charts/Legend";
import PairedBars from "#/components/charts/PairedBars";
import ChangeTable from "#/components/compare/ChangeTable";
import PeriodPicker from "#/components/compare/PeriodPicker";
import TotalsCards from "#/components/compare/TotalsCards";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import {
	compareRows,
	compareTotals,
	describeRange,
	PRESETS,
	periodsFor,
	spendingSentence,
	type CustomRanges,
	type Preset,
} from "#/lib/compare";
import { formatMoney } from "#/lib/format";
import { compareKinds } from "#/lib/needs-wants";
import { localToday } from "#/lib/planned";
import { unwrap } from "#/lib/unwrap";
import { getCategoryTotalsFn } from "#/server/transactions";

const searchSchema = z.object({
	preset: z.enum(PRESETS).optional().catch(undefined),
	// the four dates of a custom comparison
	nf: z.iso.date().optional().catch(undefined),
	nt: z.iso.date().optional().catch(undefined),
	bf: z.iso.date().optional().catch(undefined),
	bt: z.iso.date().optional().catch(undefined),
});

// Two whole months make the fairest first look; this month is only a few days old early on.
const DEFAULT_PRESET = "last_month" as const;

const toCustom = (s: z.infer<typeof searchSchema>): Partial<CustomRanges> => ({
	nowFrom: s.nf,
	nowTo: s.nt,
	beforeFrom: s.bf,
	beforeTo: s.bt,
});

export const Route = createFileRoute("/_protected/compare")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ preset: search.preset ?? DEFAULT_PRESET, ...toCustom(search) }),
	loader: async ({ deps }) => {
		const { preset, ...custom } = deps;
		const periods =
			preset === "custom"
				? periodsFor("custom", localToday(), custom)
				: periodsFor(preset, localToday());
		if (!periods) return { periods: null, before: null, now: null };
		const [before, now] = await Promise.all([
			getCategoryTotalsFn({ data: { date_from: periods.before.from, date_to: periods.before.to } }),
			getCategoryTotalsFn({ data: { date_from: periods.now.from, date_to: periods.now.to } }),
		]);
		return { periods, before: unwrap(before), now: unwrap(now) };
	},
	component: ComparePage,
});

const BEFORE_COLOR = "var(--md-sys-color-outline)";
const NOW_COLOR = "var(--chart-expense)";
const TOP_BARS = 8;

function ComparePage() {
	const { periods, before, now } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const preset: Preset = search.preset ?? DEFAULT_PRESET;

	const setPreset = useCallback(
		(next: Preset) =>
			void navigate({ search: (prev) => ({ ...prev, preset: next }), replace: true }),
		[navigate],
	);
	const setCustom = useCallback(
		(key: keyof CustomRanges, value: string) => {
			const field = { nowFrom: "nf", nowTo: "nt", beforeFrom: "bf", beforeTo: "bt" }[key] as
				| "nf"
				| "nt"
				| "bf"
				| "bt";
			void navigate({
				search: (prev) => ({ ...prev, preset: "custom", [field]: value || undefined }),
				replace: true,
			});
		},
		[navigate],
	);

	const currency = now?.currency ?? "";
	const analysis = useMemo(() => {
		if (!before || !now) return null;
		return {
			totals: compareTotals(before.categories, now.categories),
			spending: compareRows(before.categories, now.categories, "expense"),
			income: compareRows(before.categories, now.categories, "income"),
			kinds: compareKinds(before.categories, now.categories),
		};
	}, [before, now]);
	const money = useCallback((amount: string) => formatMoney(amount, currency), [currency]);

	const bars = useMemo(
		() =>
			(analysis?.spending ?? [])
				.toSorted((a, b) => Number(b.now) + Number(b.before) - (Number(a.now) + Number(a.before)))
				.slice(0, TOP_BARS)
				.map((r) => ({ name: r.category, before: Number(r.before), now: Number(r.now) })),
		[analysis],
	);
	const barTable = useMemo(
		() => ({
			head: ["Category", "Now", "Before"],
			rows: bars.map((r) => [r.name, money(String(r.now)), money(String(r.before))]),
		}),
		[bars, money],
	);

	return (
		<>
			<PageHeader
				title="Compare"
				symbol="insights"
				accent="violet"
				shape={5}
				description="Hold one period against another: what you earned, spent and kept, and which categories moved."
			/>
			<PeriodPicker
				preset={preset}
				custom={toCustom(search)}
				onPreset={setPreset}
				onCustom={setCustom}
			/>

			<PendingOverlay>
				{!periods || !analysis ? (
					<EmptyState symbol="insights" accent="violet" shape={5}>
						Pick both ranges to compare. Each needs a start and an end, in order.
					</EmptyState>
				) : (
					<Box sx={{ display: "grid", gap: 2 }}>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Now: {describeRange(periods.now.from, periods.now.to)} · Before:{" "}
							{describeRange(periods.before.from, periods.before.to)}
							{preset === "this_month" && " · this month is not over yet"}
						</Typography>
						<TotalsCards
							totals={analysis.totals}
							currency={currency}
							against={periods.before.label}
						/>
						<Typography sx={{ fontWeight: 500 }}>
							{spendingSentence(
								analysis.totals.expense,
								analysis.spending,
								periods.before.label,
								money,
							)}
						</Typography>
						{bars.length > 0 && (
							<ChartCard
								title="Spending by category"
								subtitle="The biggest categories, now against before"
								legend={
									<Legend
										items={[
											{ name: "Now", color: NOW_COLOR },
											{ name: "Before", color: BEFORE_COLOR },
										]}
									/>
								}
								table={barTable}
							>
								<PairedBars
									rows={bars}
									formatValue={(v) => money(String(v))}
									beforeColor={BEFORE_COLOR}
									nowColor={NOW_COLOR}
									beforeName="Before"
									nowName="Now"
								/>
							</ChartCard>
						)}
						{analysis.spending.length > 0 && (
							<Section title="Spending, category by category">
								<ChangeTable
									rows={analysis.spending}
									currency={currency}
									goodWhenUp={false}
									beforeName="Before"
									nowName="Now"
								/>
							</Section>
						)}
						{analysis.kinds.length > 0 && (
							<Section title="Needs and wants">
								<ChangeTable
									rows={analysis.kinds}
									currency={currency}
									goodWhenUp={false}
									beforeName="Before"
									nowName="Now"
									firstColumn="Kind"
								/>
							</Section>
						)}
						{analysis.income.length > 0 && (
							<Section title="Income, category by category">
								<ChangeTable
									rows={analysis.income}
									currency={currency}
									goodWhenUp
									beforeName="Before"
									nowName="Now"
								/>
							</Section>
						)}
					</Box>
				)}
			</PendingOverlay>
		</>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Box>
			<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
				{title}
			</Typography>
			{children}
		</Box>
	);
}
