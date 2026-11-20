import type { CategoryTotal } from "#/types/api";
import { defined } from "./utils";

/** What a node of the money-flow diagram stands for, which also decides its colour. */
export type FlowKind = "income" | "deficit" | "total" | "spending" | "saved";

export type FlowNode = {
	id: string;
	label: string;
	/** 0 where the money comes from, 1 the total, 2 where it went (a spending group, or Saved),
	 * 3 what a group was spent on, drawn only when some category has a parent */
	column: 0 | 1 | 2 | 3;
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

type Row = { label: string; value: number; children?: Row[] };

/** The `top` biggest rows, the rest folded into one "Other" row; empty and negative ones dropped. */
function biggest(rows: Row[], top: number, other: string): Row[] {
	const sorted = rows.filter((r) => r.value > 0).toSorted((a, b) => b.value - a.value);
	if (sorted.length <= top + 1) return sorted; // one "Other" would hide a single row: show it
	const rest = sorted.slice(top).reduce((sum, r) => sum + r.value, 0);
	return [...sorted.slice(0, top), { label: other, value: rest }];
}

const incomeRows = (categories: CategoryTotal[]): Row[] =>
	categories
		.filter((c) => c.type === "income")
		.map((c) => ({ label: c.category, value: Number(c.total) }));

/**
 * Spending as groups: a category with a parent goes under it, and a parent's own spending (money
 * put straight on it) becomes a "(other)" child beside its sub-categories. A category with no
 * parent and no children is a group of its own with nothing under it. Families that net to zero or
 * below are dropped like any other row.
 */
function spendingGroups(categories: CategoryTotal[]): Row[] {
	const families = new Map<string, { label: string; own: number; children: Row[] }>();
	for (const c of categories) {
		const value = Number(c.total);
		if (c.type !== "expense" || value <= 0) continue;
		const key = c.parent_id ?? c.category_id;
		const family = families.get(key) ?? { label: c.parent ?? c.category, own: 0, children: [] };
		if (c.parent_id) family.children.push({ label: c.category, value });
		else family.own += value;
		families.set(key, family);
	}
	return [...families.values()].map(({ label, own, children }) => {
		const withOwn =
			own > 0 && children.length > 0
				? [...children, { label: `${label} (other)`, value: own }]
				: children;
		return { label, value: own + children.reduce((sum, r) => sum + r.value, 0), children: withOwn };
	});
}

/**
 * Where a period's money came from and where it went, as a flow: income categories into one total,
 * out to spending categories. Money earned and not spent is a "Saved" use; money spent beyond what
 * came in is an "Overspent" source, so both sides always add up to the same total.
 * Returns null when there is neither income nor spending.
 */
export function moneyFlow(categories: CategoryTotal[], top = 5): MoneyFlow | null {
	const sources = biggest(incomeRows(categories), top, "Other income");
	const uses = biggest(spendingGroups(categories), top, "Other spending");
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
	// what each group was spent on, kept in the groups' order so no band crosses another
	uses.forEach((group, i) => {
		biggest(group.children ?? [], top, `Other ${group.label}`).forEach((child, j) => {
			add({
				id: `out:${i}:${j}`,
				label: child.label,
				column: 3,
				value: child.value,
				kind: "spending",
			});
			links.push({ source: `out:${i}`, target: `out:${i}:${j}`, value: child.value });
		});
	});
	if (income > spent) {
		const kept = income - spent;
		add({ id: "saved", label: "Saved", column: 2, value: kept, kind: "saved" });
		links.push({ source: "total", target: "saved", value: kept });
	}
	return { nodes, links, income, spent };
}

/** The right-most column in use: 2 for a flat flow, 3 when groups have something under them. */
export const lastColumn = (flow: MoneyFlow) => Math.max(...flow.nodes.map((n) => n.column));

/** How many nodes the fullest column holds, which is what sets the height a diagram needs. */
export const tallestColumn = (flow: MoneyFlow) =>
	Math.max(
		...Array.from(
			{ length: lastColumn(flow) + 1 },
			(_, c) => flow.nodes.filter((n) => n.column === c).length,
		),
	);

export type PlacedNode = FlowNode & { x: number; y: number; width: number; height: number };
export type PlacedLink = FlowLink & {
	/** A centre line from the source to the target, to be stroked `thickness` wide */
	path: string;
	thickness: number;
	/** Where the band starts and ends, for a gradient along it and to match it up with the bands in */
	x0: number;
	x1: number;
	y0: number;
	y1: number;
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
	const last = lastColumn(flow);
	const columns = Array.from({ length: last + 1 }, (_, c) =>
		flow.nodes.filter((n) => n.column === c),
	);
	const tallest = Math.max(...columns.map((col) => col.length));
	const scale = Math.max(0, height - gap * (tallest - 1)) / total;

	// Evenly spaced, except that with a fourth column the last gap is shorter: it only holds thin
	// bands (the group labels need the gap before it), and an even gap leaves them stretched out.
	// The total sits left of centre: with no gap at it, an even split makes the income side a slab
	// and squeezes the bands that fan out.
	const stops = last === 3 ? [0, 0.3, 0.76, 1] : last === 2 ? [0, 0.36, 1] : [0, 1];
	const xs = stops.map((stop) => stop * (width - nodeWidth));
	const placed = new Map<string, PlacedNode>();
	columns.forEach((col, c) => {
		const heights = col.map((n) => Math.max(minHeight, n.value * scale));
		if (c === 3) {
			// What a group was spent on fans out like a tree: each group's items get a gap between them
			// and are centred on their group (so they may stand taller than it), then the groups' blocks
			// are pushed apart where they would touch, and back inside the diagram where they would
			// run off its end. Centring the whole column instead bent every band towards the middle.
			const blocks: { parent: string; ids: number[]; size: number; top: number }[] = [];
			col.forEach((n, i) => {
				const parent = flow.links.find((l) => l.target === n.id)?.source ?? "";
				const open = blocks.at(-1);
				if (open?.parent === parent) open.ids.push(i);
				else blocks.push({ parent, ids: [i], size: 0, top: 0 });
			});
			for (const block of blocks) {
				block.size =
					block.ids.reduce((sum, i) => sum + heights[i], 0) + gap * (block.ids.length - 1);
				const group = placed.get(block.parent);
				block.top = group ? group.y + group.height / 2 - block.size / 2 : 0;
			}
			let floor = 0;
			for (const block of blocks) {
				block.top = Math.max(block.top, floor);
				floor = block.top + block.size + gap;
			}
			let ceiling = height;
			for (const block of blocks.toReversed()) {
				block.top = Math.min(block.top, ceiling - block.size);
				ceiling = block.top - gap;
			}
			for (const block of blocks) {
				let y = block.top;
				for (const i of block.ids) {
					placed.set(col[i].id, { ...col[i], x: xs[c], y, width: nodeWidth, height: heights[i] });
					y += heights[i] + gap;
				}
			}
			return;
		}
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
		const from = defined(placed.get(link.source), `node ${link.source}`);
		const to = defined(placed.get(link.target), `node ${link.target}`);
		const thickness = link.value * scale;
		const startTop =
			outCursor.get(from.id) ?? from.y + (from.height - spanOut(flow, from, scale)) / 2;
		const endTop = inCursor.get(to.id) ?? to.y + (to.height - spanIn(flow, to, scale)) / 2;
		outCursor.set(from.id, startTop + thickness);
		inCursor.set(to.id, endTop + thickness);
		// the total has no bar drawn, so the bands meet in the middle of its slot with no gap
		const x0 = from.kind === "total" ? from.x + from.width / 2 : from.x + from.width;
		const x1 = to.kind === "total" ? to.x + to.width / 2 : to.x;
		const mid = (x0 + x1) / 2;
		const y0 = startTop + thickness / 2;
		const y1 = endTop + thickness / 2;
		return {
			...link,
			thickness,
			x0,
			x1,
			y0,
			y1,
			path: `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}`,
		};
	});
	return { nodes: [...placed.values()], links };
}

/** The height a node's outgoing links take together, to centre them in the node. */
const spanOut = (flow: MoneyFlow, node: FlowNode, scale: number) =>
	flow.links.filter((l) => l.source === node.id).reduce((sum, l) => sum + l.value * scale, 0);

const spanIn = (flow: MoneyFlow, node: FlowNode, scale: number) =>
	flow.links.filter((l) => l.target === node.id).reduce((sum, l) => sum + l.value * scale, 0);

/** A strip of a band: the part of it that lines up with the lit node's own band at the total. */
export type LitSlice = { index: number; path: string; thickness: number };

/**
 * What to light besides the hovered node's own band, so the highlight runs on through the total:
 * hovering a spending node lights the strips of the income bands that feed it, and hovering an
 * income node lights the strips of the spending bands it feeds. At the total the two sides line
 * up exactly (each is stacked down the same side, centred), so each strip is where the lit band's
 * span overlaps the other band's. Nothing for the total itself or for a node past the groups.
 */
export function litSlices(layout: FlowLayout, activeId: string | null): LitSlice[] {
	const node = layout.nodes.find((n) => n.id === activeId);
	if (!node || (node.column !== 0 && node.column !== 2)) return [];
	const spending = node.column === 2;
	const lit = layout.links.find((l) =>
		spending
			? l.source === "total" && l.target === node.id
			: l.source === node.id && l.target === "total",
	);
	if (!lit) return [];
	// where each side meets the total: a band into it ends at y1, one leaving it starts at y0
	const at = (l: PlacedLink) => (spending ? l.y1 : l.y0);
	const litMid = spending ? lit.y0 : lit.y1;
	const from = litMid - lit.thickness / 2;
	const to = litMid + lit.thickness / 2;
	const slices: LitSlice[] = [];
	layout.links.forEach((l, index) => {
		if (spending ? l.target !== "total" : l.source !== "total") return;
		const lo = Math.max(from, at(l) - l.thickness / 2);
		const hi = Math.min(to, at(l) + l.thickness / 2);
		if (hi - lo < 0.01) return;
		// the strip keeps its offset from the band's centre along the whole length
		const d = (lo + hi) / 2 - at(l);
		const mid = (l.x0 + l.x1) / 2;
		slices.push({
			index,
			thickness: hi - lo,
			path: `M${l.x0},${l.y0 + d} C${mid},${l.y0 + d} ${mid},${l.y1 + d} ${l.x1},${l.y1 + d}`,
		});
	});
	return slices;
}
