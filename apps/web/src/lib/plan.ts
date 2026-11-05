import { daysBetween } from "./planned";
import { sumDecimals } from "./format";
import type { AvailableToSpend } from "#/types/api";

/** One planned payment or planned income on the plan, with what is left after it. */
export type PlanRow = {
	id: string;
	kind: "bill" | "income";
	title: string;
	date: string;
	overdue: boolean;
	amount: string;
	account: string | null;
	subscription: string | null;
	/** What is available once this bill is paid; null for income, which is not counted */
	left: string | null;
	/** Paying this bill leaves less than nothing */
	short: boolean;
	/** The first bill that does: where the plan runs out */
	firstShort: boolean;
};

/** The rows of one day, or all the overdue ones together. */
export type PlanDay = { key: string; overdue: boolean; date: string | null; rows: PlanRow[] };

/** What is available before any bill: the everyday accounts less what is set aside for goals. */
export const startingPoint = (data: Pick<AvailableToSpend, "balance" | "reserved_total">): string =>
	sumDecimals([data.balance, `-${data.reserved_total}`]);

/**
 * The bills and planned income laid out by day, overdue first, with the running figure: each bill
 * takes its amount off what is available, so you can see which one makes the month run short.
 * Income is listed on its day but never added, like the card on the dashboard.
 */
export function planDays(data: AvailableToSpend): PlanDay[] {
	const rows = [
		...data.bills.map((b) => ({ ...b, kind: "bill" as const })),
		...(data.expected ?? []).map((b) => ({ ...b, kind: "income" as const })),
	].toSorted(
		(a, b) =>
			Number(b.overdue) - Number(a.overdue) ||
			a.date.localeCompare(b.date) ||
			(a.kind === b.kind ? 0 : a.kind === "bill" ? -1 : 1) ||
			a.title.localeCompare(b.title),
	);

	let running = startingPoint(data);
	let foundShort = false;
	const days: PlanDay[] = [];
	for (const r of rows) {
		let left: string | null = null;
		if (r.kind === "bill") {
			running = sumDecimals([running, `-${r.amount}`]);
			left = running;
		}
		const short = left !== null && Number(left) < 0;
		const firstShort = short && !foundShort;
		foundShort ||= short;
		const row: PlanRow = {
			id: r.id,
			kind: r.kind,
			title: r.title,
			date: r.date,
			overdue: r.overdue,
			amount: r.amount,
			account: r.account ?? null,
			subscription: r.subscription ?? null,
			left,
			short,
			firstShort,
		};
		const key = r.overdue ? "overdue" : r.date;
		const last = days[days.length - 1];
		if (last && last.key === key) last.rows.push(row);
		else days.push({ key, overdue: r.overdue, date: r.overdue ? null : r.date, rows: [row] });
	}
	return days;
}

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** "Overdue", "Today", "Tomorrow", or "Thu 6 Nov" for a day group. */
export function dayLabel(day: PlanDay, today: string): string {
	if (day.date === null) return "Overdue";
	const away = daysBetween(today, day.date);
	if (away === 0) return "Today";
	if (away === 1) return "Tomorrow";
	return DAY.format(new Date(`${day.date}T00:00:00`));
}

/** The first bill that leaves less than nothing, if any: "Rent on Thu 6 Nov". */
export function firstShortRow(days: PlanDay[]): PlanRow | null {
	for (const d of days) for (const r of d.rows) if (r.firstShort) return r;
	return null;
}
