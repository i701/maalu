import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { memo, useMemo, useState } from "react";
import { compact } from "#/lib/charts";
import { formatMoney } from "#/lib/format";
import { moneyFlow } from "#/lib/money-flow";
import type { CategoryTotals } from "#/types/api";
import ChartCard from "../charts/ChartCard";
import Sankey from "../charts/Sankey";
import SankeyCanvas from "../charts/SankeyCanvas";

/** Where the period's money came from and where it went: income categories into the total, out to
 * spending categories and what was saved (or, when more went out than came in, the gap). */
const MoneyFlowCard = memo(function MoneyFlowCard({
	categories,
	period,
}: {
	categories: CategoryTotals;
	period: string;
}) {
	const { currency } = categories;
	const [canvasOpen, setCanvasOpen] = useState(false);
	const flow = useMemo(() => moneyFlow(categories.categories), [categories.categories]);
	const table = useMemo(() => {
		if (!flow) return undefined;
		const name = new Map(flow.nodes.map((n) => [n.id, n.label]));
		const total = flow.nodes.find((n) => n.kind === "total")?.value ?? 1;
		return {
			head: ["Flow", "Amount", "Share"],
			rows: flow.links.map((l) => [
				`${name.get(l.source)} → ${name.get(l.target)}`,
				formatMoney(String(l.value), currency),
				`${Math.round((l.value / total) * 100)}%`,
			]),
		};
	}, [flow, currency]);

	const formatValue = (v: number) => formatMoney(String(v), currency);
	const formatLabel = (v: number) =>
		v >= 1000 ? `${currency} ${compact(v)}` : formatMoney(String(v), currency);
	const ariaLabel = `Money flow in ${period}`;

	return (
		<ChartCard
			title="Money flow"
			subtitle={period}
			table={table}
			actions={
				flow && (
					<IconButton
						size="small"
						aria-label="Open full screen"
						title="Open full screen"
						onClick={() => setCanvasOpen(true)}
						sx={{ mt: -0.5 }}
					>
						<OpenInFullIcon fontSize="small" />
					</IconButton>
				)
			}
		>
			{flow === null ? (
				<Typography variant="body2" sx={{ color: "text.secondary", py: 3 }}>
					No money in or out in this period yet.
				</Typography>
			) : (
				<>
					<Sankey
						flow={flow}
						formatValue={formatValue}
						formatLabel={formatLabel}
						ariaLabel={ariaLabel}
					/>
					<SankeyCanvas
						open={canvasOpen}
						onClose={() => setCanvasOpen(false)}
						title="Money flow"
						subtitle={period}
						flow={flow}
						formatValue={formatValue}
						formatLabel={formatLabel}
						ariaLabel={ariaLabel}
					/>
				</>
			)}
		</ChartCard>
	);
});

export default MoneyFlowCard;
