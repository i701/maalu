import { formatDate, formatMoney, sumDecimals } from "#/lib/format";
import type { Budget, BudgetLine, BudgetMove, BudgetMoveLogEntry } from "#/types/api";

/** What a limit is for this period: its usual amount, plus what was carried and moved in, less what
 * was moved out. */
export const periodLimit = (line: BudgetLine): string =>
	sumDecimals([line.amount, line.carried, line.moved_in, `-${line.moved_out}`]);

/** A move as seen from one limit's card. */
export type LineMove = { id: string; text: string; note: string | null };

/** A move in words from one limit's side: "+MVR 600.00 from Dining", "−MVR 600.00 to Groceries",
 * "+MVR 300.00 added"; null when it doesn't touch that limit. */
export function moveText(move: BudgetMove, lineId: string, currency: string): string | null {
	const amount = formatMoney(move.amount, currency);
	if (move.to_line.id === lineId)
		return move.from_line ? `+${amount} from ${move.from_line.name}` : `+${amount} added`;
	if (move.from_line?.id === lineId) return `−${amount} to ${move.to_line.name}`;
	return null;
}

/** The moves that touch a limit this period, for its card. */
export function movesFor(moves: BudgetMove[], lineId: string, currency: string): LineMove[] {
	return moves.flatMap((m) => {
		const text = moveText(m, lineId, currency);
		return text === null ? [] : [{ id: m.id, text, note: m.note }];
	});
}

/** When something happened, to the minute, in the viewer's time: "06 Nov 2026, 11:58". */
export function madeAt(iso: string): string {
	const time = new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
	return `${formatDate(iso)}, ${time}`;
}

/** A limit's history grouped by the period each move was for, newest period first, keeping the
 * newest-first order inside each. */
export function historyByPeriod(
	entries: BudgetMoveLogEntry[],
): { start: string; end: string; entries: BudgetMoveLogEntry[] }[] {
	const groups = new Map<string, { start: string; end: string; entries: BudgetMoveLogEntry[] }>();
	for (const e of entries) {
		const group = groups.get(e.period_start) ?? {
			start: e.period_start,
			end: e.period_end,
			entries: [],
		};
		group.entries.push(e);
		groups.set(e.period_start, group);
	}
	return [...groups.values()].toSorted((a, b) => b.start.localeCompare(a.start));
}

/** The limits money can come from for `lineId`: every other monthly limit, with what it has left
 * this period. One with nothing left is listed but can't be chosen. Most left first. */
export function moveSources(
	budget: Budget,
	lineId: string,
): { line: BudgetLine; left: string; usable: boolean }[] {
	return budget.lines
		.filter((l) => l.id !== lineId)
		.map((line) => ({ line, left: line.available, usable: Number(line.available) > 0 }))
		.toSorted((a, b) => Number(b.left) - Number(a.left));
}

/** Why an amount can't be moved from a source, or null when it can. The API checks again. */
export function moveProblem(amount: string, left: string | null): string | null {
	if (!/^\d+(\.\d{1,4})?$/.test(amount) || Number(amount) <= 0)
		return "Enter an amount greater than 0";
	if (left === null) return null; // a top-up has no cap
	if (Number(sumDecimals([left, `-${amount}`])) < 0) return "That is more than it has left";
	return null;
}
