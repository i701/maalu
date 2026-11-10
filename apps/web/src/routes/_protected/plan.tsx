import Box from "@mui/material/Box";
import Money from "#/components/Money";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import MetricCard from "#/components/dashboard/MetricCard";
import EmptyState from "#/components/EmptyState";
import MarkPaidDialog from "#/components/MarkPaidDialog";
import SalarySplitHost from "#/components/SalarySplitHost";
import { useSalaryOffer } from "#/lib/use-salary-offer";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import PlanAgenda from "#/components/plan/PlanAgenda";
import PlanAside from "#/components/plan/PlanAside";
import { RouterLink } from "#/components/RouterLinks";
import TonalChip from "#/components/TonalChip";
import { isShort } from "#/lib/available";
import { formatDate, formatMoney, sumDecimals } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { firstShortRow, planDays } from "#/lib/plan";
import { staggerChildren } from "#/lib/motion";
import { unwrap } from "#/lib/unwrap";
import { getAvailableToSpendFn } from "#/server/stats";
import { listUpcomingFn } from "#/server/transactions";
import type { Transaction } from "#/types/api";

export const Route = createFileRoute("/_protected/plan")({
	loader: async () => {
		const [available, upcoming] = await Promise.all([getAvailableToSpendFn(), listUpcomingFn()]);
		return { available: unwrap(available), upcoming: upcoming.ok ? upcoming.data : [] };
	},
	component: PlanPage,
});

/** The sentence that says whether the plan holds: fine, or which bill makes it run short. */
function Verdict({
	data,
	short,
	when,
}: {
	data: ReturnType<typeof firstShortRow>;
	short: boolean;
	when: string | null;
}) {
	if (!short)
		return (
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				Every bill planned until the end of the period is covered.
			</Typography>
		);
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
			<TonalChip accent={ACCENT.orange} label="Short" />
			<Typography variant="body2">
				{data
					? `The money runs out at ${data.title}${when ? ` (${when})` : ""}.`
					: "Set aside money covers more than you hold."}
			</Typography>
		</Box>
	);
}

function PlanPage() {
	const { available, upcoming } = Route.useLoaderData();
	const [payingId, setPayingId] = useState<string | null>(null);
	const salary = useSalaryOffer();
	const days = useMemo(() => planDays(available), [available]);
	const paying: Transaction | undefined = upcoming.find((t) => t.id === payingId);
	const short = isShort(available);
	const culprit = firstShortRow(days);
	const c = available.currency;
	const overdue =
		available.bills.filter((b) => b.overdue).length +
		available.card_payments.filter((x) => x.overdue).length;
	const toPay = sumDecimals([available.bills_total, available.card_payments_total]);

	return (
		<>
			<PageHeader
				title="Month plan"
				symbol="checklist"
				accent="amber"
				shape={3}
				stats={[
					{
						symbol: "calendar_month",
						label: `${formatDate(available.today)} – ${formatDate(available.period_end)}`,
					},
				]}
				description="What you can spend until the end of the budget period, and the bills in the way."
			/>

			<PendingOverlay>
				{available.accounts.length === 0 ? (
					<EmptyState firstRun symbol="account_balance" accent="amber" shape={3}>
						Add a cash, current or debit account and this shows what you can spend after your bills.{" "}
						<RouterLink to="/accounts">Go to Accounts</RouterLink>
					</EmptyState>
				) : (
					<Box sx={{ display: "grid", gap: 2.5, ...staggerChildren() }}>
						<Box
							sx={{
								display: "grid",
								gap: 2,
								gridTemplateColumns: {
									xs: "minmax(0, 1fr)",
									sm: "repeat(2, 1fr)",
									lg: "repeat(4, 1fr)",
								},
							}}
						>
							<MetricCard label="You have" value={formatMoney(available.balance, c)} />
							<MetricCard
								label={`Bills to pay${overdue > 0 ? ` (${overdue} overdue)` : ""}`}
								value={formatMoney(toPay, c)}
							/>
							<MetricCard label="Set aside" value={formatMoney(available.reserved_total, c)} />
							<MetricCard
								label={short ? "Short by" : "Available to spend"}
								value={formatMoney(
									short ? available.available.replace("-", "") : available.available,
									c,
								)}
							/>
						</Box>

						<Verdict
							data={culprit}
							short={short}
							when={culprit ? formatDate(culprit.date) : null}
						/>

						<Box
							sx={{
								display: "grid",
								gap: 3,
								gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 1fr)" },
								alignItems: "start",
							}}
						>
							<Box
								sx={{
									p: 2.5,
									borderRadius: "var(--shape-xl)",
									bgcolor: "var(--md-sys-color-surface-container-low)",
								}}
							>
								<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600, mb: 1.5 }}>
									Bills by day
								</Typography>
								{days.length === 0 ? (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Nothing planned before {formatDate(available.period_end)}. A subscription's next
										payment and anything you mark as planned shows up here.
									</Typography>
								) : (
									<PlanAgenda
										days={days}
										today={available.today}
										currency={c}
										onPay={setPayingId}
									/>
								)}
								{Number(available.expected_income) > 0 && (
									<Typography
										variant="caption"
										component="p"
										sx={{ color: "text.secondary", mt: 2 }}
									>
										<Money amount={available.expected_income} currency={c} /> of income is expected
										before then. It is listed on its day but never counted until it arrives. Press
										Received to enter what you actually got.
									</Typography>
								)}
							</Box>
							<Box
								sx={{
									p: 2.5,
									borderRadius: "var(--shape-xl)",
									bgcolor: "var(--md-sys-color-surface-container-low)",
								}}
							>
								<PlanAside data={available} />
							</Box>
						</Box>
					</Box>
				)}
			</PendingOverlay>

			{paying && (
				<MarkPaidDialog
					transaction={paying}
					baseCurrency={available.currency}
					onPaid={salary.offer}
					onClose={() => setPayingId(null)}
				/>
			)}
			<SalarySplitHost id={salary.id} onClose={salary.close} />
		</>
	);
}
