import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import ChartCard from "#/components/charts/ChartCard";
import Waterfall from "#/components/charts/Waterfall";
import DeltaChip from "#/components/compare/DeltaChip";
import PeriodPicker from "#/components/compare/PeriodPicker";
import MetricCard from "#/components/dashboard/MetricCard";
import EmptyState from "#/components/EmptyState";
import AccountsTable from "#/components/net-worth/AccountsTable";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import { describeRange, periodsFor, PRESETS, type CustomRanges, type Preset } from "#/lib/compare";
import { formatMoney } from "#/lib/format";
import {
	DRIVER_HELP,
	DRIVER_LABELS,
	changePercent,
	netWorthSentence,
	waterfallBars,
} from "#/lib/net-worth";
import { localToday } from "#/lib/planned";
import { unwrap } from "#/lib/unwrap";
import { getNetWorthDriversFn } from "#/server/stats";

const searchSchema = z.object({
	preset: z.enum(PRESETS).optional().catch(undefined),
	// the two dates of a custom period
	nf: z.iso.date().optional().catch(undefined),
	nt: z.iso.date().optional().catch(undefined),
});

// A rolling month is always a full month of days, unlike "this month" early on.
const DEFAULT_PRESET = "last_30" as const;

export const Route = createFileRoute("/_protected/net-worth")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		preset: search.preset ?? DEFAULT_PRESET,
		nf: search.nf,
		nt: search.nt,
	}),
	loader: async ({ deps }) => {
		const periods =
			deps.preset === "custom"
				? periodsFor("custom", localToday(), {
						nowFrom: deps.nf,
						nowTo: deps.nt,
						// only the first range is used here; the other must be complete for periodsFor
						beforeFrom: deps.nf,
						beforeTo: deps.nt,
					})
				: periodsFor(deps.preset, localToday());
		if (!periods) return { range: null, data: null };
		const data = unwrap(
			await getNetWorthDriversFn({ data: { from: periods.now.from, to: periods.now.to } }),
		);
		return { range: periods.now, data };
	},
	component: NetWorthPage,
});

const COLORS = {
	up: "var(--chart-income)",
	down: "var(--chart-expense)",
	total: "var(--chart-line)",
};

function NetWorthPage() {
	const { range, data } = Route.useLoaderData();
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
			const field = key === "nowFrom" ? "nf" : "nt";
			void navigate({
				search: (prev) => ({ ...prev, preset: "custom", [field]: value || undefined }),
				replace: true,
			});
		},
		[navigate],
	);

	const currency = data?.currency ?? "";
	const money = useCallback((amount: string) => formatMoney(amount, currency), [currency]);
	const signed = useCallback(
		(v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${formatMoney(String(Math.abs(v)), currency)}`,
		[currency],
	);
	const bars = useMemo(() => (data ? waterfallBars(data.drivers, data.change) : []), [data]);
	const table = useMemo(
		() => ({
			head: ["What", "Amount"],
			rows: (data?.drivers ?? []).map((d) => [DRIVER_LABELS[d.key], signed(Number(d.amount))]),
		}),
		[data, signed],
	);
	const describe = useCallback(
		(bar: { key: string }) =>
			bar.key in DRIVER_HELP
				? DRIVER_HELP[bar.key as keyof typeof DRIVER_HELP]
				: "All of the above added up",
		[],
	);

	return (
		<>
			<PageHeader
				title="Net worth"
				symbol="finance"
				accent="green"
				shape={4}
				description="How what you own less what you owe moved over a period, and what moved it."
			/>
			<PeriodPicker
				single
				preset={preset}
				custom={{ nowFrom: search.nf, nowTo: search.nt }}
				onPreset={setPreset}
				onCustom={setCustom}
			/>

			<PendingOverlay>
				{!range || !data ? (
					<EmptyState symbol="finance" accent="green" shape={4}>
						Pick a start and an end date, in order.
					</EmptyState>
				) : (
					<Box sx={{ display: "grid", gap: 2 }}>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							From the end of the day before {describeRange(range.from, range.to).split(" to ")[0]}{" "}
							to the end of {describeRange(range.from, range.to).split(" to ")[1]}.
						</Typography>
						<Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "repeat(3, 1fr)" } }}>
							<MetricCard label="At the start" value={money(data.start)} />
							<MetricCard label="At the end" value={money(data.end)} />
							<MetricCard
								label="Change"
								value={money(data.change)}
								badge={
									<DeltaChip
										row={{
											before: data.start,
											now: data.end,
											change: data.change,
											percent: changePercent(data),
										}}
										currency={currency}
										goodWhenUp
									/>
								}
							/>
						</Box>
						<Typography sx={{ fontWeight: 500 }}>{netWorthSentence(data, money)}</Typography>

						<ChartCard
							title="What moved it"
							subtitle="Each bar starts where the one before ended, from zero (where you started) to the total change"
							table={table}
						>
							<Waterfall
								bars={bars}
								formatSigned={signed}
								describe={describe}
								colors={COLORS}
								ariaLabel="What moved net worth, step by step"
							/>
						</ChartCard>
						<Box sx={{ display: "grid", gap: 0.5 }}>
							{data.drivers
								.filter((d) => Number(d.amount) !== 0)
								.map((d) => (
									<Typography key={d.key} variant="caption" sx={{ color: "text.secondary" }}>
										<strong>{DRIVER_LABELS[d.key]}.</strong> {DRIVER_HELP[d.key]}
									</Typography>
								))}
						</Box>

						{data.accounts.length > 0 && (
							<Box>
								<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
									Account by account
								</Typography>
								<AccountsTable accounts={data.accounts} currency={currency} />
							</Box>
						)}
					</Box>
				)}
			</PendingOverlay>
		</>
	);
}
