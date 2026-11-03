import type { CategoryTotal } from "#/types/api";
import { monthBounds, monthLabel, percentChange, shiftMonth } from "./dashboard";
import { formatDate, sumDecimals } from "./format";

export const PRESETS = ["this_month", "last_month", "last_30", "this_year", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export const PRESET_LABELS: Record<Preset, string> = {
	this_month: "This month",
	last_month: "Last month",
	last_30: "Last 30 days",
	this_year: "This year",
	custom: "Custom",
};

export type Range = { from: string; to: string };
/** The two stretches being compared and what to call each. `now` is the one being looked at and
 * `before` the one it is held against. */
export type Periods = {
	now: Range & { label: string };
	before: Range & { label: string };
};

const pad = (n: number) => String(n).padStart(2, "0");

export function addDays(iso: string, days: number): string {
	const [y, m, d] = iso.split("-").map(Number);
	const t = new Date(Date.UTC(y, m - 1, d + days));
	return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** The same month and day `years` earlier; 29 February becomes the 28th when that year has none. */
export function sameDayYearsAgo(iso: string, years: number): string {
	const [y, m, d] = iso.split("-").map(Number);
	const last = new Date(Date.UTC(y - years, m, 0)).getUTCDate();
	return `${y - years}-${pad(m)}-${pad(Math.min(d, last))}`;
}

/** Whole months only: "October 2026". */
const monthRange = (on: string) => {
	const { start, end } = monthBounds(on);
	return { from: start, to: end, label: monthLabel(on) };
};

/** The two periods a preset stands for on `today`. A month is the whole month (so this one is not
 * over yet), a year is the year so far held against the same days a year before, so the two are
 * the same length. `custom` takes the ranges as typed, or null when they are not both complete. */
export function periodsFor(preset: Exclude<Preset, "custom">, today: string): Periods;
export function periodsFor(
	preset: "custom",
	today: string,
	custom: Partial<CustomRanges>,
): Periods | null;
export function periodsFor(
	preset: Preset,
	today: string,
	custom: Partial<CustomRanges> = {},
): Periods | null {
	switch (preset) {
		case "this_month":
			return {
				now: monthRange(today),
				before: monthRange(shiftMonth(today, -1)),
			};
		case "last_month":
			return {
				now: monthRange(shiftMonth(today, -1)),
				before: monthRange(shiftMonth(today, -2)),
			};
		case "last_30":
			return {
				now: { from: addDays(today, -29), to: today, label: "the last 30 days" },
				before: { from: addDays(today, -59), to: addDays(today, -30), label: "the 30 days before" },
			};
		case "this_year": {
			const year = today.slice(0, 4);
			return {
				now: { from: `${year}-01-01`, to: today, label: `${year} so far` },
				before: {
					from: `${Number(year) - 1}-01-01`,
					to: sameDayYearsAgo(today, 1),
					label: `the same days of ${Number(year) - 1}`,
				},
			};
		}
		case "custom": {
			const { nowFrom, nowTo, beforeFrom, beforeTo } = custom;
			if (!nowFrom || !nowTo || !beforeFrom || !beforeTo) return null;
			if (nowFrom > nowTo || beforeFrom > beforeTo) return null;
			return {
				now: { from: nowFrom, to: nowTo, label: describeRange(nowFrom, nowTo) },
				before: { from: beforeFrom, to: beforeTo, label: describeRange(beforeFrom, beforeTo) },
			};
		}
	}
}

export type CustomRanges = { nowFrom: string; nowTo: string; beforeFrom: string; beforeTo: string };

/** "1 Nov 2026 to 30 Nov 2026" */
export function describeRange(from: string, to: string): string {
	return `${formatDate(from)} to ${formatDate(to)}`;
}

export type Change = {
	before: string;
	now: string;
	/** now less before, exactly */
	change: string;
	/** how much it moved as a share of before; null when before was nothing to compare with */
	percent: number | null;
};

const changeOf = (before: string, now: string): Change => ({
	before,
	now,
	change: sumDecimals([now, `-${before}`]),
	percent: percentChange(now, before),
});

export type CompareRow = Change & {
	categoryId: string;
	category: string;
	parent: string | null;
	color: string;
	/** `new` had nothing before, `gone` has nothing now */
	state: "new" | "gone" | "both";
};

const identity = (c: CategoryTotal) => ({
	categoryId: c.category_id,
	category: c.category,
	parent: c.parent,
	color: c.color,
});

/** Every category of one kind that has money in either period, biggest move first (in either
 * direction), so what changed most is at the top. */
export function compareRows(
	before: CategoryTotal[],
	now: CategoryTotal[],
	type: "income" | "expense",
): CompareRow[] {
	const rows = new Map<string, CompareRow>();
	for (const t of before.filter((x) => x.type === type)) {
		rows.set(t.category_id, { ...identity(t), ...changeOf(t.total, "0"), state: "gone" });
	}
	for (const t of now.filter((x) => x.type === type)) {
		const previous = rows.get(t.category_id);
		rows.set(t.category_id, {
			...identity(t),
			...changeOf(previous?.before ?? "0", t.total),
			state: previous ? "both" : "new",
		});
	}
	return [...rows.values()].toSorted(
		(a, b) =>
			Math.abs(Number(b.change)) - Math.abs(Number(a.change)) ||
			a.category.localeCompare(b.category),
	);
}

export type Totals = { income: Change; expense: Change; kept: Change };

const total = (cats: CategoryTotal[], type: "income" | "expense") =>
	sumDecimals(cats.filter((c) => c.type === type).map((c) => c.total));

/** Income, spending and what was kept (income less spending) in each period. Refunds are already
 * taken off spending by the API, so spending can be below what was bought. */
export function compareTotals(before: CategoryTotal[], now: CategoryTotal[]): Totals {
	const [bi, be, ni, ne] = [
		total(before, "income"),
		total(before, "expense"),
		total(now, "income"),
		total(now, "expense"),
	];
	return {
		income: changeOf(bi, ni),
		expense: changeOf(be, ne),
		kept: changeOf(sumDecimals([bi, `-${be}`]), sumDecimals([ni, `-${ne}`])),
	};
}

/** The categories that moved spending most, as a short list each way: where it went up and where
 * it came down. Rows with no change are left out. */
export function biggestMoves(rows: CompareRow[], count = 3) {
	const up = rows.filter((r) => Number(r.change) > 0).slice(0, count);
	const down = rows.filter((r) => Number(r.change) < 0).slice(0, count);
	return { up, down };
}

/** One plain sentence on how spending moved and which categories did it, for the top of the page.
 * `against` is what it is held against ("October 2026"). Only categories that moved the same way
 * as the total are named, since the others pulled the other way. */
export function spendingSentence(
	expense: Change,
	rows: CompareRow[],
	against: string,
	money: (amount: string) => string,
): string {
	if (Number(expense.now) === 0 && Number(expense.before) === 0)
		return "There is no spending in either period.";
	const moved = Number(expense.change);
	if (moved === 0) return `Spending is the same as in ${against}.`;
	const up = moved > 0;
	const share = expense.percent === null ? "" : ` (${Math.round(Math.abs(expense.percent))}%)`;
	const head = `Spending is ${up ? "up" : "down"} ${money(expense.change.replace("-", ""))}${share} on ${against}.`;
	const { up: rising, down: falling } = biggestMoves(rows);
	const named = (up ? rising : falling)
		.map((r) => `${r.category} ${up ? "+" : "-"}${money(r.change.replace("-", ""))}`)
		.join(", ");
	return named ? `${head} Most of it: ${named}.` : head;
}
