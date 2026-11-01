import { describe, expect, it } from "vitest";
import type { CategoryTotal } from "#/types/api";
import { layoutFlow, moneyFlow } from "./money-flow";

const cat = (type: "income" | "expense", category: string, total: number) =>
	({ type, category, total: String(total) }) as CategoryTotal;

describe("moneyFlow", () => {
	it("is nothing when there is no money in or out", () => {
		expect(moneyFlow([])).toBeNull();
		expect(moneyFlow([cat("expense", "Food", 0)])).toBeNull();
	});

	it("saves what was earned and not spent", () => {
		const flow = moneyFlow([cat("income", "Salary", 1000), cat("expense", "Food", 300)])!;
		expect(flow.income).toBe(1000);
		expect(flow.spent).toBe(300);
		const saved = flow.nodes.find((n) => n.kind === "saved");
		expect(saved?.value).toBe(700);
		expect(flow.nodes.find((n) => n.kind === "deficit")).toBeUndefined();
		expect(flow.nodes.find((n) => n.kind === "total")?.value).toBe(1000);
	});

	it("shows spending beyond income as a source of its own", () => {
		const flow = moneyFlow([cat("income", "Salary", 500), cat("expense", "Rent", 800)])!;
		expect(flow.nodes.find((n) => n.kind === "deficit")?.value).toBe(300);
		expect(flow.nodes.find((n) => n.kind === "saved")).toBeUndefined();
		expect(flow.nodes.find((n) => n.kind === "total")?.value).toBe(800);
	});

	it("balances: what goes in equals the total equals what comes out", () => {
		for (const [income, spent] of [
			[1000, 300],
			[300, 1000],
			[500, 500],
			[0, 200],
			[200, 0],
		]) {
			const flow = moneyFlow([
				...(income ? [cat("income", "A", income)] : []),
				...(spent ? [cat("expense", "B", spent)] : []),
			])!;
			const total = flow.nodes.find((n) => n.kind === "total")!.value;
			const into = flow.links.filter((l) => l.target === "total").reduce((s, l) => s + l.value, 0);
			const out = flow.links.filter((l) => l.source === "total").reduce((s, l) => s + l.value, 0);
			expect(into).toBeCloseTo(total);
			expect(out).toBeCloseTo(total);
		}
	});

	it("folds the smallest into Other, but never hides a single row behind it", () => {
		const many = Array.from({ length: 8 }, (_, i) => cat("expense", `C${i}`, 100 - i));
		const labels = moneyFlow([cat("income", "Pay", 5000), ...many])!
			.nodes.filter((n) => n.kind === "spending")
			.map((n) => n.label);
		expect(labels).toEqual(["C0", "C1", "C2", "C3", "C4", "Other spending"]);
		const exactlySix = Array.from({ length: 6 }, (_, i) => cat("expense", `C${i}`, 100 - i));
		const shown = moneyFlow([cat("income", "Pay", 5000), ...exactlySix])!
			.nodes.filter((n) => n.kind === "spending")
			.map((n) => n.label);
		expect(shown).toHaveLength(6); // all six, no Other
		expect(shown).not.toContain("Other spending");
	});

	it("ignores categories that net to nothing or below (a refund bigger than the spending)", () => {
		const flow = moneyFlow([
			cat("income", "Pay", 100),
			cat("expense", "Food", 40),
			cat("expense", "Gadgets", -5),
		])!;
		expect(flow.nodes.some((n) => n.label === "Gadgets")).toBe(false);
		expect(flow.spent).toBe(40);
	});
});

describe("layoutFlow", () => {
	const flow = moneyFlow([
		cat("income", "Salary", 800),
		cat("income", "Side", 200),
		cat("expense", "Rent", 500),
		cat("expense", "Food", 300),
	])!; // saves 200
	const box = { width: 600, height: 300, nodeWidth: 12, gap: 8 };

	it("puts the three columns at the left, the middle and the right", () => {
		const { nodes } = layoutFlow(flow, box);
		const x = (kind: string) => nodes.find((n) => n.kind === kind)!.x;
		expect(x("income")).toBe(0);
		expect(x("total")).toBe(294);
		expect(x("spending")).toBe(588);
	});

	it("draws heights in proportion to the money, on one scale", () => {
		const { nodes } = layoutFlow(flow, box);
		const h = (label: string) => nodes.find((n) => n.label === label)!.height;
		expect(h("Salary") / h("Side")).toBeCloseTo(4);
		expect(h("Rent") / h("Food")).toBeCloseTo(5 / 3);
		const total = nodes.find((n) => n.kind === "total")!;
		expect(h("Salary") + h("Side")).toBeCloseTo(total.height);
	});

	it("keeps everything inside the box and nodes in a column apart", () => {
		const { nodes } = layoutFlow(flow, box);
		for (const n of nodes) {
			expect(n.y).toBeGreaterThanOrEqual(-0.001);
			expect(n.y + n.height).toBeLessThanOrEqual(box.height + 0.001);
		}
		const right = nodes.filter((n) => n.column === 2).toSorted((a, b) => a.y - b.y);
		for (let i = 1; i < right.length; i++)
			expect(right[i].y).toBeGreaterThanOrEqual(right[i - 1].y + right[i - 1].height + 7.99);
	});

	it("gives every link a thickness in proportion to its money and a path between its nodes", () => {
		const { links, nodes } = layoutFlow(flow, box);
		const scale = nodes.find((n) => n.kind === "total")!.height / 1000;
		for (const l of links) {
			expect(l.thickness).toBeCloseTo(l.value * scale);
			expect(l.path.startsWith("M")).toBe(true);
			expect(l.path).toContain("C");
		}
	});

	it("stacks the links on the total so none overlaps", () => {
		const { links, nodes } = layoutFlow(flow, box);
		const total = nodes.find((n) => n.kind === "total")!;
		const arriving = links.filter((l) => l.target === "total");
		const ends = arriving.map((l) => Number(l.path.split(" ").at(-1)!.split(",")[1]));
		const sum = arriving.reduce((s, l) => s + l.thickness, 0);
		expect(sum).toBeCloseTo(total.height);
		expect(ends[1] - ends[0]).toBeCloseTo((arriving[0].thickness + arriving[1].thickness) / 2);
	});

	it("never makes a node thinner than the minimum", () => {
		const tiny = moneyFlow([cat("income", "Pay", 100000), cat("expense", "Gum", 1)])!;
		const { nodes } = layoutFlow(tiny, { ...box, minHeight: 4 });
		expect(nodes.find((n) => n.label === "Gum")!.height).toBeGreaterThanOrEqual(4);
	});
});
