import { formatDate } from "#/lib/format";

export const MIN_GROUP = 2;
export const MAX_GROUP = 50;

/** Why this many selected transactions can't make a new group, or null when they can. */
export function groupSizeProblem(count: number): string | null {
	if (count < MIN_GROUP) return `Select at least ${MIN_GROUP} transactions to make a group`;
	if (count > MAX_GROUP) return `A group holds at most ${MAX_GROUP} transactions`;
	return null;
}

/** "1 Mar 2026" for one day, "1 Mar 2026 – 9 Mar 2026" for a span, "" for none. */
export function dateSpan(from: string | null, to: string | null): string {
	if (!from || !to) return "";
	return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The toast after putting transactions in a group. */
export const groupedMessage = (count: number, name: string, created: boolean) =>
	created
		? `Made "${name}" from ${plural(count, "transaction", "transactions")}`
		: `Added ${plural(count, "transaction", "transactions")} to "${name}"`;
