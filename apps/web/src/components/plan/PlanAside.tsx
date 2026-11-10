import Box from "@mui/material/Box";
import Money from "#/components/Money";
import Typography from "@mui/material/Typography";
import type { AvailableToSpend } from "#/types/api";

function Line({ name, amount, currency }: { name: string; amount: string; currency: string }) {
	return (
		<Box
			component="li"
			sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "baseline" }}
		>
			<Typography noWrap sx={{ fontSize: 14, minWidth: 0, flex: 1 }}>
				{name}
			</Typography>
			<Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
				<Money amount={amount} currency={currency} />
			</Typography>
		</Box>
	);
}

function Block({
	title,
	note,
	children,
}: {
	title: string;
	note: string;
	children: React.ReactNode;
}) {
	return (
		<Box sx={{ minWidth: 0 }}>
			<Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.6 }}>
				{title}
			</Typography>
			<Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
				{note}
			</Typography>
			<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
				{children}
			</Box>
		</Box>
	);
}

/** Where the rest of the money is: what is set aside for goals, accounts it counts and accounts it
 * does not. */
export default function PlanAside({ data }: { data: AvailableToSpend }) {
	const c = data.currency;
	return (
		<Box sx={{ display: "grid", gap: 3 }}>
			<Block title="You have" note="Everyday accounts the figure starts from">
				{data.accounts.map((a) => (
					<Line key={a.id} name={a.name} amount={a.balance} currency={c} />
				))}
			</Block>
			{data.reserved.length > 0 && (
				<Block
					title="Set aside for goals"
					note="Money you put aside by hand, kept out of what is spendable"
				>
					{data.reserved.map((r) => (
						<Line key={r.goal_id} name={r.name} amount={r.amount} currency={c} />
					))}
				</Block>
			)}
			{data.kept_apart.length > 0 && (
				<Block
					title="Kept apart"
					note="Savings and accounts a goal follows: not counted as spendable"
				>
					{data.kept_apart.map((a) => (
						<Line key={a.id} name={a.name} amount={a.balance} currency={c} />
					))}
				</Block>
			)}
		</Box>
	);
}
