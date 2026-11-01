import type { CategoryTotal } from "#/types/api";

/** What a node of the money-flow diagram stands for, which also decides its colour. */
export type FlowKind = "income" | "deficit" | "total" | "spending" | "saved";

export type FlowNode = {
	id: string;
	label: string;
	/** 0 where the money comes from, 1 the total, 2 where it went */
	column: 0 | 1 | 2;
	value: number;
	kind: FlowKind;
};

export type FlowLink = { source: string; target: string; value: number };

export type MoneyFlow = {
	nodes: FlowNode[];
	links: FlowLink[];
	income: number;
	spent: number;
};

type Row = { label: string; value: number };

/** The `top` biggest rows, the rest folded into one "Other" row; empty and negative ones dropped. */
function biggest(rows: Row[], top: number, other: string): Row[] {
	const sorted = rows.filter((r) => r.value > 0).toSorted((a, b) => b.value - a.value);
	if (sorted.length <= top + 1) return sorted; // one "Other" would hide a single row: show it
	const rest = sorted.slice(top).reduce((sum, r) => sum + r.value, 0);
	return [...sorted.slice(0, top), { label: other, value: rest }];
}

const rowsOf = (categories: CategoryTotal[], type: "income" | "expense"): Row[] =>
	categories
		.filter((c) => c.type === type)
		.map((c) => ({ label: c.category, value: Number(c.total) }));

/**
 * Where a period's money came from and where it went, as a flow: income categories into one total,
 * out to spending categories. Money earned and not spent is a "Saved" use; money spent beyond what
 * came in is an "Overspent" source, so both sides always add up to the same total.
 * Returns null when there is neither income nor spending.
 */
export function moneyFlow(categories: CategoryTotal[], top = 5): MoneyFlow | null {
	const sources = biggest(rowsOf(categories, "income"), top, "Other income");
	const uses = biggest(rowsOf(categories, "expense"), top, "Other spending");
	const income = sources.reduce((sum, r) => sum + r.value, 0);
	const spent = uses.reduce((sum, r) => sum + r.value, 0);
	if (income === 0 && spent === 0) return null;

	const total = Math.max(income, spent);
	const nodes: FlowNode[] = [];
	const links: FlowLink[] = [];
	const add = (node: FlowNode) => nodes.push(node);

	sources.forEach((r, i) => {
		add({ id: `in:${i}`, label: r.label, column: 0, value: r.value, kind: "income" });
		links.push({ source: `in:${i}`, target: "total", value: r.value });
	});
	if (spent > income) {
		const gap = spent - income;
		add({ id: "deficit", label: "Overspent", column: 0, value: gap, kind: "deficit" });
		links.push({ source: "deficit", target: "total", value: gap });
	}
	add({ id: "total", label: "Total", column: 1, value: total, kind: "total" });
	uses.forEach((r, i) => {
		add({ id: `out:${i}`, label: r.label, column: 2, value: r.value, kind: "spending" });
		links.push({ source: "total", target: `out:${i}`, value: r.value });
	});
	if (income > spent) {
		const kept = income - spent;
		add({ id: "saved", label: "Saved", column: 2, value: kept, kind: "saved" });
		links.push({ source: "total", target: "saved", value: kept });
	}
	return { nodes, links, income, spent };
}

export type PlacedNode = FlowNode & { x: number; y: number; width: number; height: number };
export type PlacedLink = FlowLink & {
	/** A centre line from the source to the target, to be stroked `thickness` wide */
	path: string;
	thickness: number;
};
export type FlowLayout = { nodes: PlacedNode[]; links: PlacedLink[] };

export type LayoutOptions = {
	width: number;
	height: number;
	nodeWidth?: number;
	gap?: number;
	minHeight?: number;
};

/**
 * Positions the nodes and links in a `width` by `height` box: one column per side with the total in
 * the middle, heights in proportion to the money (the same scale everywhere), each column centred
 * vertically, links stacked along the sides of the nodes in the order of the nodes. A node never
 * gets thinner than `minHeight`, so a tiny category stays visible.
 */
export function layoutFlow(
	flow: MoneyFlow,
	{ width, height, nodeWidth = 12, gap = 8, minHeight = 4 }: LayoutOptions,
): FlowLayout {
	const total = flow.nodes.find((n) => n.kind === "total")?.value ?? 1;
	const columns = [0, 1, 2].map((c) => flow.nodes.filter((n) => n.column === c));
	const tallest = Math.max(...columns.map((col) => col.length));
	const scale = Math.max(0, height - gap * (tallest - 1)) / total;

	const xs = [0, (width - nodeWidth) / 2, width - nodeWidth];
	const placed = new Map<string, PlacedNode>();
	columns.forEach((col, c) => {
		const heights = col.map((n) => Math.max(minHeight, n.value * scale));
		const used = heights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, col.length - 1);
		let y = (height - used) / 2;
		col.forEach((n, i) => {
			placed.set(n.id, { ...n, x: xs[c], y, width: nodeWidth, height: heights[i] });
			y += heights[i] + gap;
		});
	});

	// Where the next link leaves (or arrives at) each node: they stack down its side.
	const outCursor = new Map<string, number>();
	const inCursor = new Map<string, number>();
	const links: PlacedLink[] = flow.links.map((link) => {
		const from = placed.get(link.source)!;
		const to = placed.get(link.target)!;
		const thickness = link.value * scale;
		const startTop =
			outCursor.get(from.id) ?? from.y + (from.height - spanOut(flow, from, scale)) / 2;
		const endTop = inCursor.get(to.id) ?? to.y + (to.height - spanIn(flow, to, scale)) / 2;
		outCursor.set(from.id, startTop + thickness);
		inCursor.set(to.id, endTop + thickness);
		const x0 = from.x + from.width;
		const x1 = to.x;
		const mid = (x0 + x1) / 2;
		const y0 = startTop + thickness / 2;
		const y1 = endTop + thickness / 2;
		return { ...link, thickness, path: `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}` };
	});
	return { nodes: [...placed.values()], links };
}

/** The height a node's outgoing links take together, to centre them in the node. */
const spanOut = (flow: MoneyFlow, node: FlowNode, scale: number) =>
	flow.links.filter((l) => l.source === node.id).reduce((sum, l) => sum + l.value * scale, 0);

const spanIn = (flow: MoneyFlow, node: FlowNode, scale: number) =>
	flow.links.filter((l) => l.target === node.id).reduce((sum, l) => sum + l.value * scale, 0);
