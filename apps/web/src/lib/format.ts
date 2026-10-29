/** Display only. Amounts stay decimal strings everywhere else. */
export function formatMoney(amount: string, currency: string): string {
	try {
		return new Intl.NumberFormat("en", { style: "currency", currency }).format(
			amount as unknown as number, // Intl accepts decimal strings and keeps them exact
		);
	} catch {
		return `${amount} ${currency}`;
	}
}

export function formatDate(iso: string): string {
	return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/** "14:30:00" (or "14:30") as "14:30"; null stays null. */
export function formatTime(time: string | null): string | null {
	return time ? time.slice(0, 5) : null;
}

/** The date, with the time after it when there is one: "10 Mar 2026, 14:30". */
export function formatWhen(iso: string, time: string | null): string {
	const t = formatTime(time);
	return t ? `${formatDate(iso)}, ${t}` : formatDate(iso);
}

export const COMMON_CURRENCIES = [
	"MVR",
	"USD",
	"EUR",
	"GBP",
	"INR",
	"LKR",
	"AED",
	"SGD",
	"AUD",
	"CAD",
	"JPY",
	"CNY",
	"SAR",
];

/** "/ month" or "every 3 months". */
export function formatInterval(unit: string, count: number): string {
	return count === 1 ? `/ ${unit}` : `every ${count} ${unit}s`;
}

/** Whole days from today (local) to an ISO date; negative when in the past. */
export function daysUntil(iso: string): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

/** Exact sum of decimal strings (no floats): scales to integers with BigInt. */
export function sumDecimals(values: string[]): string {
	const SCALE = 8;
	let total = 0n;
	for (const v of values) {
		const negative = v.startsWith("-");
		const [int, frac = ""] = v.replace("-", "").split(".");
		const scaled = BigInt(int + frac.padEnd(SCALE, "0").slice(0, SCALE));
		total += negative ? -scaled : scaled;
	}
	const negative = total < 0n;
	const digits = (negative ? -total : total).toString().padStart(SCALE + 1, "0");
	const whole = digits.slice(0, -SCALE);
	const fraction = digits.slice(-SCALE).replace(/0+$/, "").padEnd(2, "0");
	return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Today's date as YYYY-MM-DD in the user's own time zone (not UTC, which can be a day off). */
export function todayIso(): string {
	const d = new Date();
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** "15.39920000" -> "15.3992": a rate without its trailing zeros. */
export function trimRate(rate: string): string {
	return rate.includes(".") ? rate.replace(/0+$/, "").replace(/\.$/, "") : rate;
}
