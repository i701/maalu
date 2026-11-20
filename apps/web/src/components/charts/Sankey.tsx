import Box from "@mui/material/Box";
import { useCallback, useId, useMemo, useState } from "react";
import { spreadLabels } from "#/lib/charts";
import {
	type FlowKind,
	lastColumn,
	layoutFlow,
	litSlices,
	type MoneyFlow,
	tallestColumn,
	type PlacedLink,
	type PlacedNode,
} from "#/lib/money-flow";
import ChartTooltip from "./ChartTooltip";

const LABEL_WIDTH = 170; // room for a name beside each outer column
const MIN_WIDTH = 620; // narrower than this the diagram scrolls rather than squeezes
const MIN_WIDTH_DEEP = 860; // a fourth column (sub-categories) needs room for the group labels
const GROUP_LABEL_WIDTH = 150; // a group's name, drawn just left of its bar
const NODE_WIDTH = 6; // the thin bar at each node
const LABEL_HEIGHT = 18;
const TOP = 30; // room above the diagram for the total's label
const BOTTOM = 8;

/** Income green and spending orange like the other charts, the saved share in the line blue; the
 * total in a neutral. Colour only says which side; the labels carry the names. */
const COLOR: Record<FlowKind, string> = {
	income: "var(--chart-income)",
	deficit: "var(--chart-expense)",
	total: "var(--chart-line)",
	spending: "var(--chart-expense)",
	saved: "var(--chart-line)",
};

/** The colours a band blends between, as on Android and iOS. A band into the total is its income's
 * colour; one leaving the total starts as the colour of the income band at the same height there
 * and ends as its destination's. */
const linkKinds = (
	flow: MoneyFlow,
	links: PlacedLink[],
	link: PlacedLink,
): [FlowKind, FlowKind] => {
	const kind = (id: string) => flow.nodes.find((n) => n.id === id)?.kind ?? "total";
	if (link.target === "total") return [kind(link.source), kind(link.source)];
	if (link.source !== "total") return [kind(link.source), kind(link.target)];
	const incoming = links.filter((l) => l.target === "total");
	const match =
		incoming.find((l) => Math.abs(l.y0 - link.y0) <= l.thickness / 2 + 0.001) ?? incoming[0];
	return [match ? kind(match.source) : "income", kind(link.target)];
};

type SankeyProps = {
	flow: MoneyFlow;
	/** The exact amount, for the readout and the screen reader */
	formatValue: (value: number) => string;
	/** A shorter amount for the labels beside the bars, where room is tight */
	formatLabel?: (value: number) => string;
	ariaLabel: string;
};

/**
 * A Sankey diagram of a period's money: where it came from, the total, where it went, fitted to its
 * card (and scrolling sideways when the card is narrower than it can be drawn).
 */
export default function Sankey({ height, ...props }: SankeyProps & { height?: number }) {
	const [width, setWidth] = useState(0);
	const measure = useCallback((el: HTMLDivElement | null) => {
		if (!el) return undefined;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setWidth(entry.contentRect.width);
		});
		observer.observe(el);
		setWidth(el.clientWidth);
		return () => observer.disconnect();
	}, []);

	return (
		<Box sx={{ overflowX: "auto" }} ref={measure}>
			<SankeyDiagram
				{...props}
				width={Math.max(lastColumn(props.flow) > 2 ? MIN_WIDTH_DEEP : MIN_WIDTH, width)}
				height={height ?? roomyHeight(tallestColumn(props.flow))}
			/>
		</Box>
	);
}

/** The height a diagram needs for `nodes` nodes so that no label crowds its neighbour. */
export const roomyHeight = (nodes: number) => Math.max(320, nodes * 34 + TOP + BOTTOM);

/**
 * The diagram at an exact size. Bars and bands are SVG; every label is HTML on top (kept apart so
 * none overlap). Hovering or focusing a node lights up its links and shows its amount and share;
 * every value is also in the card's table.
 */
export function SankeyDiagram({
	flow,
	formatValue,
	formatLabel = formatValue,
	ariaLabel,
	width,
	height,
}: SankeyProps & { width: number; height: number }) {
	const [active, setActive] = useState<string | null>(null);
	const gradientId = useId();

	const inner = width - 2 * LABEL_WIDTH;
	const layout = useMemo(
		() =>
			layoutFlow(flow, {
				width: inner,
				height: height - TOP - BOTTOM,
				nodeWidth: NODE_WIDTH,
			}),
		[flow, inner, height],
	);
	const total = flow.nodes.find((n) => n.kind === "total")?.value ?? 1;
	const last = lastColumn(flow);
	const labelY = useMemo(() => {
		const out = new Map<string, number>();
		for (const column of [0, 2, 3] as const) {
			const nodes = layout.nodes.filter((n) => n.column === column);
			if (nodes.length === 0) continue;
			const spread = spreadLabels(
				nodes.map((n) => n.y + n.height / 2),
				LABEL_HEIGHT,
				LABEL_HEIGHT / 2,
				height - TOP - BOTTOM - LABEL_HEIGHT / 2,
			);
			nodes.forEach((n, i) => {
				out.set(n.id, spread[i]);
			});
		}
		return out;
	}, [layout, height]);

	const linked = (source: string, target: string) =>
		active === null || active === source || active === target;
	const lit = useMemo(() => litSlices(layout, active), [layout, active]);
	const activeNode = layout.nodes.find((n) => n.id === active) ?? null;

	return (
		<Box role="group" aria-label={ariaLabel} sx={{ position: "relative", width, height }}>
			<svg
				width="100%"
				height={height}
				aria-hidden
				style={{ position: "absolute", inset: 0, overflow: "visible" }}
			>
				<g transform={`translate(${LABEL_WIDTH} ${TOP})`}>
					<defs>
						{layout.links.map((l, i) => {
							const [from, to] = linkKinds(flow, layout.links, l);
							return (
								<linearGradient
									key={`${l.source}>${l.target}`}
									id={`${gradientId}-${i}`}
									gradientUnits="userSpaceOnUse"
									x1={l.x0}
									x2={l.x1}
									y1={0}
									y2={0}
								>
									<stop offset="0" stopColor={COLOR[from]} />
									<stop offset="1" stopColor={COLOR[to]} />
								</linearGradient>
							);
						})}
					</defs>
					{layout.links.map((l, i) => (
						<path
							key={`${l.source}>${l.target}`}
							d={l.path}
							fill="none"
							stroke={`url(#${gradientId}-${i})`}
							strokeWidth={Math.max(1, l.thickness)}
							strokeOpacity={linked(l.source, l.target) ? (active ? 0.5 : 0.32) : 0.08}
							style={{ transition: "stroke-opacity 150ms ease-out" }}
						/>
					))}
					{lit.map((slice) => (
						<path
							key={slice.index}
							d={slice.path}
							fill="none"
							stroke={`url(#${gradientId}-${slice.index})`}
							strokeWidth={slice.thickness}
							strokeOpacity={0.5}
						/>
					))}
					{layout.nodes
						.filter((n) => n.kind !== "total") // the bands meet there; no bar, as on Android and iOS
						.map((n) => (
							<rect
								key={n.id}
								x={n.x}
								y={n.y}
								width={n.width}
								height={n.height}
								rx={NODE_WIDTH / 2}
								fill={COLOR[n.kind]}
							/>
						))}
				</g>
			</svg>
			{layout.nodes.map((n) => (
				<NodeLabel
					key={n.id}
					node={n}
					last={last}
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
						left: LABEL_WIDTH + activeNode.x + (activeNode.column === last ? -150 : 24),
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
	);
}

/** A node's name and amount beside it: left of the left column, right of the right one, over the
 * total for the middle. It is the hover and focus target of its node. */
function NodeLabel({
	node,
	last,
	total,
	y,
	formatValue,
	formatLabel,
	onActive,
}: {
	node: PlacedNode;
	/** the right-most column, whose labels stand to the right of the bars */
	last: number;
	total: number;
	y: number;
	formatValue: (value: number) => string;
	formatLabel: (value: number) => string;
	onActive: (id: string | null) => void;
}) {
	// the outer columns label outwards; a group in a deeper diagram labels just left of its bar
	const placement =
		node.column === 1
			? "total"
			: node.column === 0
				? "left"
				: node.column === last
					? "right"
					: "inner";
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
				borderRadius: "var(--shape-md)",
				outline: "none",
				"&:focus-visible": {
					boxShadow: "0 0 0 2px var(--md-sys-color-primary)",
				},
				...(placement === "left" && {
					right: `calc(100% - ${LABEL_WIDTH - 8}px)`,
					justifyContent: "flex-end",
					maxWidth: LABEL_WIDTH - 12,
				}),
				...(placement === "right" && {
					left: LABEL_WIDTH + node.x + NODE_WIDTH + 8,
					maxWidth: LABEL_WIDTH - 12,
				}),
				...(placement === "inner" && {
					right: `calc(100% - ${LABEL_WIDTH + node.x - 8}px)`,
					justifyContent: "flex-end",
					maxWidth: GROUP_LABEL_WIDTH,
					px: 0.5,
					// it sits over the bands coming in, so it gets a backing
					bgcolor: "color-mix(in srgb, var(--md-sys-color-surface-container-low) 80%, transparent)",
				}),
				...(placement === "total" && {
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
				sx={{
					color: "var(--md-sys-color-on-surface-variant)",
					fontVariantNumeric: "tabular-nums",
				}}
			>
				{formatLabel(node.value)}
			</Box>
		</Box>
	);
}
