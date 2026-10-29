/** Today as YYYY-MM-DD in the user's own time zone (not UTC, which can be yesterday or tomorrow). */
export function localToday(): string {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to`, both YYYY-MM-DD: positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** A planned transaction whose day has passed without being marked as paid. */
export function isOverdue(t: { planned: boolean; transaction_date: string }, today: string) {
	return t.planned && t.transaction_date < today;
}

/** Whether a date means the transaction is still to come, so "planned" is the natural choice. */
export function isFuture(date: string, today: string) {
	return date > today;
}

/** "Due today", "Due tomorrow", "Due in 5 days", "1 day overdue", "3 days overdue". */
export function dueLabel(date: string, today: string): string {
	const days = daysBetween(today, date);
	if (days === 0) return "Due today";
	if (days === 1) return "Due tomorrow";
	if (days > 1) return `Due in ${days} days`;
	const late = -days;
	return `${late} ${late === 1 ? "day" : "days"} overdue`;
}
