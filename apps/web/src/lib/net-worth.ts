import type { NetWorthDriver, NetWorthDrivers } from "#/types/api";
import { percentChange } from "./dashboard";

export const DRIVER_LABELS: Record<NetWorthDriver["key"], string> = {
	income: "Income",
	spending: "Spending",
	adjustments: "Balance adjustments",
	transfers: "Transfers across net worth",
	exchange_rates: "Exchange rates",
};

/** What each driver means, for the table and a hover. */
export const DRIVER_HELP: Record<NetWorthDriver["key"], string> = {
	income: "Money that came in, not counting refunds.",
	spending: "Money that went out, less what refunds gave back.",
	adjustments: "Corrections that made an account match its bank.",
	transfers:
		"Money moved to or from an account that is not part of net worth (archived, or left out of the stats).",
	exchange_rates:
		"Accounts in another currency are worth a different amount in your base currency when their rate changes.",
};

export type Bar = {
	key: string;
	label: string;
	/** the amount, negative when it took away */
	value: number;
	/** where the bar starts and ends on the chart's one scale, `low` the smaller of the two */
	low: number;
	high: number;
	kind: "driver" | "total";
};

/** The bars of a waterfall: each driver that is not zero, floating from where the one before it
 * ended (so the bars chain from zero, which is where net worth stood at the start), then the total
 * change from zero. Zero drivers are left out. */
export function waterfallBars(drivers: NetWorthDriver[], change: string): Bar[] {
	let running = 0;
	const bars: Bar[] = [];
	for (const d of drivers) {
		const value = Number(d.amount);
		if (value === 0) continue;
		bars.push({
			key: d.key,
			label: DRIVER_LABELS[d.key],
			value,
			low: Math.min(running, running + value),
			high: Math.max(running, running + value),
			kind: "driver",
		});
		running += value;
	}
	const total = Number(change);
	bars.push({
		key: "change",
		label: "Total change",
		value: total,
		low: Math.min(0, total),
		high: Math.max(0, total),
		kind: "total",
	});
	return bars;
}

/** How much net worth moved as a share of where it started, or null when it started at or below
 * zero, which makes a percentage meaningless. */
export function changePercent(data: Pick<NetWorthDrivers, "start" | "change">): number | null {
	return percentChange(String(Number(data.start) + Number(data.change)), data.start);
}

/** Two or three plain sentences: what net worth did and which drivers moved it most. `money`
 * formats an amount. Drivers that came to nothing are not mentioned. */
export function netWorthSentence(data: NetWorthDrivers, money: (amount: string) => string): string {
	const change = Number(data.change);
	if (change === 0 && data.drivers.every((d) => Number(d.amount) === 0))
		return `Net worth stayed at ${money(data.end)}.`;
	const absolute = (amount: string) => money(amount.replace("-", ""));
	const percent = changePercent(data);
	const head =
		change === 0
			? `Net worth ended where it began, at ${money(data.end)}, but things moved underneath.`
			: `Net worth ${change > 0 ? "rose" : "fell"} ${absolute(data.change)}${
					percent === null ? "" : ` (${Math.abs(percent).toFixed(1)}%)`
				}, from ${money(data.start)} to ${money(data.end)}.`;
	const kept =
		Number(data.drivers.find((d) => d.key === "income")?.amount ?? 0) +
		Number(data.drivers.find((d) => d.key === "spending")?.amount ?? 0);
	const parts: string[] = [];
	if (kept !== 0)
		parts.push(
			kept > 0
				? `You kept ${absolute(String(kept))} (income less spending).`
				: `You spent ${absolute(String(-kept))} more than you earned.`,
		);
	const others = data.drivers
		.filter((d) => !["income", "spending"].includes(d.key) && Number(d.amount) !== 0)
		.toSorted((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
		.map(
			(d) =>
				`${DRIVER_LABELS[d.key].toLowerCase()} ${Number(d.amount) > 0 ? "added" : "took"} ${absolute(d.amount)}`,
		);
	if (others.length > 0) parts.push(`${others.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()));
	return [head, ...parts].join(" ");
}
