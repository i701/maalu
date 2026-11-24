import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { memo, useState } from "react";
import Money from "#/components/Money";
import { RouterButton } from "#/components/RouterLinks";
import IconSymbol from "#/components/Symbol";
import TonalChip from "#/components/TonalChip";
import AvailableWorking from "#/components/dashboard/AvailableWorking";
import { hasAccounts, isShort, workingLine } from "#/lib/available";
import { useCardMorph } from "#/lib/card-morph";
import { percentChange } from "#/lib/dashboard";
import { keptSplit } from "#/lib/deck";
import { formatDate } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import type { AvailableToSpend, MonthlyPoint, TransactionTotals } from "#/types/api";

const bigFigure = {
	ml: "auto",
	textAlign: "right",
	fontSize: { xs: 36, lg: 44 },
	lineHeight: 1.05,
	"--figure-weight": 600,
} as const;

/** What can be spent until the end of the period: the number, the sum in words, the full working a
 * click away and the way to the month plan. */
function AvailableBlock({ data }: { data: AvailableToSpend }) {
	const [open, setOpen] = useState(false);
	const short = isShort(data);
	return (
		<Box sx={{ minWidth: 0 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Available to spend until {formatDate(data.period_end)}
				</Typography>
				{short && <TonalChip accent={ACCENT.orange} label="Short" />}
				{hasAccounts(data) && (
					<Typography sx={{ ...bigFigure, color: short ? "var(--chart-expense)" : "text.primary" }}>
						<Money amount={data.available} currency={data.currency} figure />
					</Typography>
				)}
			</Box>
			{hasAccounts(data) ? (
				<>
					<Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
						{workingLine(data)}
						{short && ". You are short unless more comes in or a bill moves."}
					</Typography>
					<Button
						size="small"
						color="inherit"
						sx={{ mt: 1, ml: -1 }}
						onClick={() => setOpen(!open)}
					>
						{open ? "Hide the working" : "Show the working"}
					</Button>
					<RouterButton to="/plan" size="small" color="inherit" sx={{ mt: 1 }}>
						Open the month plan
					</RouterButton>
					{open && <AvailableWorking data={data} />}
				</>
			) : (
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
					Add a cash, current or debit account and this shows what you can spend after your bills.{" "}
					<Link to="/accounts">Go to Accounts</Link>
				</Typography>
			)}
		</Box>
	);
}

/** A donut of the part of the income kept, the rest faint, in the card's accent. */
function Donut({ share }: { share: number }) {
	const kept = share * 100;
	const ring = { fill: "none", strokeWidth: 14, pathLength: 100, transform: "rotate(-90 50 50)" };
	return (
		<svg width={92} height={92} viewBox="0 0 100 100" aria-hidden>
			<circle cx={50} cy={50} r={36} stroke="currentColor" strokeOpacity={0.28} {...ring} />
			<circle
				cx={50}
				cy={50}
				r={36}
				stroke="currentColor"
				strokeDasharray={`${kept} ${100 - kept}`}
				strokeLinecap="round"
				{...ring}
			/>
		</svg>
	);
}

/** What each of the last months kept as small bars, the newest solid, with a letter under each. */
function MiniBars({ months }: { months: MonthlyPoint[] }) {
	const kept = months.map((m) => Math.max(Number(m.income) - Number(m.expense), 0));
	const top = Math.max(...kept, 1);
	return (
		<Box aria-hidden sx={{ display: "flex", alignItems: "flex-end", gap: 0.75, height: 92 }}>
			{months.map((m, i) => (
				<Box key={m.month} sx={{ display: "grid", justifyItems: "center", gap: 0.25 }}>
					<Box
						sx={{
							width: 10,
							height: Math.max((kept[i] / top) * 66, 3),
							borderRadius: "3px",
							bgcolor: "currentColor",
							opacity: i === months.length - 1 ? 1 : 0.28,
						}}
					/>
					<Typography sx={{ fontSize: 10, color: "text.secondary" }}>
						{new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "narrow" })}
					</Typography>
				</Box>
			))}
		</Box>
	);
}

function Legend({
	title,
	share,
	amount,
	currency,
	dim = false,
}: {
	title: string;
	share: number;
	amount: string;
	currency: string;
	dim?: boolean;
}) {
	return (
		<Box sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
			<Box
				sx={{
					width: 8,
					height: 8,
					borderRadius: "50%",
					bgcolor: "var(--md-sys-color-primary)",
					opacity: dim ? 0.28 : 1,
					flexShrink: 0,
				}}
			/>
			<Box sx={{ minWidth: 0 }}>
				<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
					{title} {Math.round(share * 100)}%
				</Typography>
				<Typography sx={{ fontSize: 13, color: "text.secondary" }} noWrap>
					<Money amount={amount} currency={currency} compact />
				</Typography>
			</Box>
		</Box>
	);
}

/** What was kept this month, how spending moved against last month, and a donut of the income kept
 * against spent with the last months beside it. */
function KeptBlock({
	kept,
	totals,
	before,
	months,
	previousLabel,
}: {
	kept: string;
	totals: TransactionTotals;
	before: TransactionTotals;
	months: MonthlyPoint[];
	previousLabel: string;
}) {
	const change = percentChange(totals.expense, before.expense);
	const rounded = change === null ? 0 : Math.round(change);
	const split = keptSplit(Number(totals.income), Number(totals.expense));
	return (
		<Box sx={{ minWidth: 0 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{Number(kept) >= 0 ? "Kept this month" : "Overspent this month"}
				</Typography>
				{rounded !== 0 && (
					<TonalChip
						accent={rounded > 0 ? "var(--md-sys-color-error)" : ACCENT.green}
						icon={<IconSymbol name={rounded > 0 ? "arrow_upward" : "arrow_downward"} size={14} />}
						label={`${Math.abs(rounded)}% spending vs ${previousLabel}`}
					/>
				)}
				<Typography sx={bigFigure}>
					<Money amount={kept} currency={totals.currency} figure />
				</Typography>
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
				{split ? (
					<>
						of <Money amount={totals.income} currency={totals.currency} /> income
					</>
				) : (
					<>
						<Money amount={totals.expense} currency={totals.currency} /> spent, no income yet
					</>
				)}
			</Typography>
			{split && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5 }}>
					<Box sx={{ color: "var(--md-sys-color-primary)" }}>
						<Donut share={split.keptShare} />
					</Box>
					<Box sx={{ display: "grid", gap: 1.25, flex: 1, minWidth: 0 }}>
						<Legend
							title="Kept"
							share={split.keptShare}
							amount={Math.max(Number(kept), 0).toString()}
							currency={totals.currency}
						/>
						<Legend
							title="Spent"
							share={split.spentShare}
							amount={totals.expense}
							currency={totals.currency}
							dim
						/>
					</Box>
					<Box sx={{ color: "var(--md-sys-color-primary)" }}>
						<MiniBars months={months.slice(-6)} />
					</Box>
				</Box>
			)}
		</Box>
	);
}

/**
 * The Dashboard's summary as one card, as the flat canvas on iOS: what can be spent and what was
 * kept, side by side on a wide screen and one under the other on a narrow one, parted by a
 * hairline.
 */
const SummaryCard = memo(function SummaryCard({
	available,
	kept,
	totals,
	before,
	months,
	previousLabel,
}: {
	available: AvailableToSpend | null;
	kept: string;
	totals: TransactionTotals;
	before: TransactionTotals;
	months: MonthlyPoint[];
	previousLabel: string;
}) {
	const cardMorph = useCardMorph();
	return (
		<Box
			sx={{
				p: { xs: 1.75, sm: 2.5 },
				minWidth: 0,
				...cardMorph,
				bgcolor: "var(--md-sys-color-surface-container-low)",
				display: "grid",
				gap: 2.5,
				gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: available ? "1fr auto 1fr" : "1fr" },
			}}
		>
			{available && (
				<>
					<AvailableBlock data={available} />
					<Box
						role="separator"
						sx={{
							bgcolor: "var(--md-sys-color-outline-variant)",
							height: { xs: "1px", lg: "auto" },
							width: { xs: "auto", lg: "1px" },
						}}
					/>
				</>
			)}
			<KeptBlock
				kept={kept}
				totals={totals}
				before={before}
				months={months}
				previousLabel={previousLabel}
			/>
		</Box>
	);
});

export default SummaryCard;
