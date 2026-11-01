import Box from "@mui/material/Box";
import { useCallback, useMemo, useState } from "react";
import { spreadLabels } from "#/lib/charts";
import { layoutFlow, type FlowKind, type MoneyFlow, type PlacedNode } from "#/lib/money-flow";
import ChartTooltip from "./ChartTooltip";

const LABEL_WIDTH = 170; // room for a name beside each outer column
const MIN_WIDTH = 620; // narrower than this the diagram scrolls rather than squeezes
const NODE_WIDTH = 12;
const LABEL_HEIGHT = 18;
const TOP = 30; // room above the diagram for the total's label
const BOTTOM = 8;

/** Income green and spending orange like the other charts, the saved share in the line blue; the
 * total in a neutral. Colour only says which side; the labels carry the names. */
const COLOR: Record<FlowKind, string> = {
	income: "var(--chart-income)",
	deficit: "var(--chart-expense)",
	total: "var(--md-sys-color-outline)",
	spending: "var(--chart-expense)",
	saved: "var(--chart-line)",
};

/** A link takes the colour of its outer end (the source on the left, the target on the right). */
const linkColor = (flow: MoneyFlow, source: string, target: string) => {
	const outer = source === "total" ? target : source;
	return COLOR[flow.nodes.find((n) => n.id === outer)?.kind ?? "total"];
};

/**
 * A Sankey diagram of a period's money: where it came from, the total, where it went. Bars and
 * bands are SVG; every label is HTML on top (kept apart so none overlap). Hovering or focusing a
 * node lights up its links and shows its amount and share; every value is also in the card's table.
 */
export default function Sankey({
	flow,
	formatValue,
	formatLabel = formatValue,
	ariaLabel,
	height = 320,
}: {
	flow: MoneyFlow;
	/** The exact amount, for the readout and the screen reader */
	formatValue: (value: number) => string;
	/** A shorter amount for the labels beside the bars, where room is tight */
	formatLabel?: (value: number) => string;
	ariaLabel: string;
	height?: number;
}) {
	const [width, setWidth] = useState(0);
	const [active, setActive] = useState<string | null>(null);

	const measure = useCallback((el: HTMLDivElement | null) => {
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setWidth(entry.contentRect.width);
		});
		observer.observe(el);
		setWidth(el.clientWidth);
		return () => observer.disconnect();
	}, []);

	const inner = Math.max(MIN_WIDTH, width) - 2 * LABEL_WIDTH;
	const layout = useMemo(
		() => layoutFlow(flow, { width: inner, height: height - TOP - BOTTOM, nodeWidth: NODE_WIDTH }),
		[flow, inner, height],
	);
	const total = flow.nodes.find((n) => n.kind === "total")?.value ?? 1;
	const labelY = useMemo(() => {
		const out = new Map<string, number>();
		for (const column of [0, 2] as const) {
			const nodes = layout.nodes.filter((n) => n.column === column);
			const spread = spreadLabels(
				nodes.map((n) => n.y + n.height / 2),
				LABEL_HEIGHT,
				LABEL_HEIGHT / 2,
				height - TOP - BOTTOM - LABEL_HEIGHT / 2,
			);
			nodes.forEach((n, i) => out.set(n.id, spread[i]));
		}
		return out;
	}, [layout, height]);

	const linked = (source: string, target: string) =>
		active === null || active === source || active === target;
	const activeNode = layout.nodes.find((n) => n.id === active) ?? null;

	return (
		<Box sx={{ overflowX: "auto" }} ref={measure}>
			<Box
				role="group"
				aria-label={ariaLabel}
				sx={{ position: "relative", width: Math.max(MIN_WIDTH, width), height }}
			>
				<svg
					width="100%"
					height={height}
					aria-hidden
					style={{ position: "absolute", inset: 0, overflow: "visible" }}
				>
					<g transform={`translate(${LABEL_WIDTH} ${TOP})`}>
						{layout.links.map((l) => (
							<path
								key={`${l.source}>${l.target}`}
								d={l.path}
								fill="none"
								stroke={linkColor(flow, l.source, l.target)}
								strokeWidth={Math.max(1, l.thickness)}
								strokeOpacity={linked(l.source, l.target) ? (active ? 0.5 : 0.32) : 0.08}
								style={{ transition: "stroke-opacity 150ms ease-out" }}
							/>
						))}
						{layout.nodes.map((n) => (
							<rect
								key={n.id}
								x={n.x}
								y={n.y}
								width={n.width}
								height={n.height}
								rx={3}
								fill={COLOR[n.kind]}
							/>
						))}
					</g>
				</svg>
				{layout.nodes.map((n) => (
					<NodeLabel
						key={n.id}
						node={n}
						total={total}
						y={(labelY.get(n.id) ?? n.y + n.height / 2) + TOP}
						formatValue={formatValue}
						formatLabel={formatLabel}
						onActive={setActive}
					/>
				))}
				{activeNode && (
					<Box
						sx={{
							position: "absolute",
							left: LABEL_WIDTH + activeNode.x + (activeNode.column === 2 ? -150 : 24),
							top: TOP + activeNode.y + activeNode.height / 2 - 28,
							zIndex: 2,
						}}
					>
						<ChartTooltip
							title={activeNode.label}
							rows={[
								{
									label: "amount",
									value: formatValue(activeNode.value),
									color: COLOR[activeNode.kind],
								},
								{
									label: "of the total",
									value: `${Math.round((activeNode.value / total) * 100)}%`,
									color: COLOR[activeNode.kind],
								},
							]}
						/>
					</Box>
				)}
			</Box>
		</Box>
	);
}

/** A node's name and amount beside it: left of the left column, right of the right one, over the
 * total for the middle. It is the hover and focus target of its node. */
function NodeLabel({
	node,
	total,
	y,
	formatValue,
	formatLabel,
	onActive,
}: {
	node: PlacedNode;
	total: number;
	y: number;
	formatValue: (value: number) => string;
	formatLabel: (value: number) => string;
	onActive: (id: string | null) => void;
}) {
	const side = node.column;
	const share = Math.round((node.value / total) * 100);
	return (
		<Box
			tabIndex={0}
			aria-label={`${node.label}, ${formatValue(node.value)}, ${share}% of the total`}
			onMouseEnter={() => onActive(node.id)}
			onMouseLeave={() => onActive(null)}
			onFocus={() => onActive(node.id)}
			onBlur={() => onActive(null)}
			sx={{
				position: "absolute",
				top: y - LABEL_HEIGHT / 2,
				height: LABEL_HEIGHT,
				display: "flex",
				alignItems: "center",
				gap: 0.75,
				whiteSpace: "nowrap",
				fontSize: 12.5,
				borderRadius: "var(--shape-xs)",
				outline: "none",
				"&:focus-visible": { boxShadow: "0 0 0 2px var(--md-sys-color-primary)" },
				...(side === 0 && {
					right: `calc(100% - ${LABEL_WIDTH - 8}px)`,
					justifyContent: "flex-end",
					maxWidth: LABEL_WIDTH - 12,
				}),
				...(side === 2 && {
					left: LABEL_WIDTH + node.x + NODE_WIDTH + 8,
					maxWidth: LABEL_WIDTH - 12,
				}),
				...(side === 1 && {
					left: LABEL_WIDTH + node.x - 74,
					width: NODE_WIDTH + 148,
					justifyContent: "center",
					top: TOP + node.y - LABEL_HEIGHT - 4,
				}),
			}}
		>
			<Box
				component="span"
				sx={{
					color: "var(--md-sys-color-on-surface)",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			>
				{node.label}
			</Box>
			<Box
				component="span"
				sx={{ color: "var(--md-sys-color-on-surface-variant)", fontVariantNumeric: "tabular-nums" }}
			>
				{formatLabel(node.value)}
			</Box>
		</Box>
	);
}
