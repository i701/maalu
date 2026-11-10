import { useCardMorph } from "#/lib/card-morph";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { RouterButton } from "../RouterLinks";
import { memo, useState } from "react";
import { hasAccounts, isShort, workingLine } from "#/lib/available";
import { formatDate, formatMoney } from "#/lib/format";
import type { AvailableToSpend } from "#/types/api";
import TonalChip from "../TonalChip";
import { ACCENT } from "#/lib/m3";

/** One line of the working: a name (and a note) with its amount. */
function Row({
	name,
	note,
	amount,
	currency,
}: {
	name: string;
	note?: string;
	amount: string;
	currency: string;
}) {
	return (
		<Box
			component="li"
			sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "baseline" }}
		>
			<Typography noWrap sx={{ fontSize: 14, minWidth: 0, flex: 1 }}>
				{name}
				{note && (
					<Typography component="span" sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}>
						{note}
					</Typography>
				)}
			</Typography>
			<Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
				{formatMoney(amount, currency)}
			</Typography>
		</Box>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Box sx={{ minWidth: 0 }}>
			<Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.6 }}>
				{title}
			</Typography>
			<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
				{children}
			</Box>
		</Box>
	);
}

/** The sums behind the number: where it starts, what is still to pay and what is set aside. */
function Working({ data }: { data: AvailableToSpend }) {
	const c = data.currency;
	return (
		<Box
			sx={{
				display: "grid",
				gap: 2,
				mt: 2,
				gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(3, minmax(0, 1fr))" },
			}}
		>
			<Section title="You have">
				{data.accounts.map((a) => (
					<Row key={a.id} name={a.name} amount={a.balance} currency={c} />
				))}
			</Section>
			<Section title="Still to pay">
				{data.bills.length === 0 && data.card_payments.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Nothing planned before {formatDate(data.period_end)}.
					</Typography>
				)}
				{data.bills.map((b) => (
					<Row
						key={b.id}
						name={b.title}
						note={`${b.overdue ? "overdue" : formatDate(b.date)}${b.estimate ? " · estimate" : ""}`}
						amount={b.amount}
						currency={c}
					/>
				))}
				{data.card_payments.map((x) => (
					<Row
						key={x.account_id}
						name={`${x.title} card payment`}
						note={x.overdue ? "overdue" : formatDate(x.date)}
						amount={x.amount}
						currency={c}
					/>
				))}
			</Section>
			<Section title="Set aside for goals">
				{data.reserved.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Nothing set aside by hand.
					</Typography>
				)}
				{data.reserved.map((r) => (
					<Row key={r.goal_id} name={r.name} amount={r.amount} currency={c} />
				))}
			</Section>
			{Number(data.expected_income) > 0 && (
				<Typography variant="caption" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
					{formatMoney(data.expected_income, c)} of income is planned before then. It is not counted
					until it arrives.
				</Typography>
			)}
		</Box>
	);
}

/**
 * What you can spend until the end of the budget period: what your everyday accounts hold, less the
 * planned bills still to pay and the money set aside for goals. The number first, in words below it
 * so it can be checked, and the full working a click away.
 */
const AvailableCard = memo(function AvailableCard({ data }: { data: AvailableToSpend }) {
	const cardMorph = useCardMorph();
	const [open, setOpen] = useState(false);
	const short = isShort(data);
	return (
		<Box
			sx={{
				p: { xs: 1.75, sm: 2.5 },
				minWidth: 0,
				...cardMorph,
				// a wash of colour: green while there is room, orange when you are short
				bgcolor: `color-mix(in srgb, ${short ? ACCENT.orange : ACCENT.green} 14%, var(--md-sys-color-surface-container-low))`,
			}}
		>
			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Available to spend until {formatDate(data.period_end)}
				</Typography>
				{short && <TonalChip accent={ACCENT.orange} label="Short" />}
			</Box>
			{hasAccounts(data) ? (
				<>
					<Typography
						sx={{
							fontSize: { xs: 26, lg: 32 },
							fontWeight: 600,
							lineHeight: 1.25,
							mt: 0.5,
							color: short ? "var(--chart-expense)" : "text.primary",
						}}
					>
						{formatMoney(data.available, data.currency)}
					</Typography>
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
					{open && <Working data={data} />}
				</>
			) : (
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
					Add a cash, current or debit account and this shows what you can spend after your bills.{" "}
					<Link to="/accounts">Go to Accounts</Link>
				</Typography>
			)}
		</Box>
	);
});

export default AvailableCard;
