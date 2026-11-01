import { sumDecimals } from "./format";

export type MonthAmounts = { month: string; income: string; expense: string };

export type NetRow = {
	month: string;
	income: number;
	expense: number;
	/** income less expenses: positive when more came in than went out */
	net: number;
	/** the same, exactly, for display */
	netText: string;
	/** what has been kept from the first month shown up to and including this one */
	running: number;
	runningText: string;
};

/** What was kept (or overspent) in each month: income less expenses, which already has refunds
 * taken off spending, so a month can come out higher than its income. Each row also carries the
 * running total from the first month shown, so it depends on which months are passed in. */
export function netRows(months: MonthAmounts[]): NetRow[] {
	let runningText = "0";
	return months.map((m) => {
		const netText = sumDecimals([m.income, `-${m.expense}`]);
		runningText = sumDecimals([runningText, netText]);
		return {
			month: m.month,
			income: Number(m.income),
			expense: Number(m.expense),
			net: Number(netText),
			netText,
			running: Number(runningText),
			runningText,
		};
	});
}

/** The last `count` of the months, which come oldest first. */
export const lastMonths = <T>(months: T[], count: number): T[] => months.slice(-count);

/** The range options the card offers, in months. */
export const RANGES = [6, 12] as const;
export type Range = (typeof RANGES)[number];
