/** Display only. Amounts stay decimal strings everywhere else. */
function fullMoney(amount: string, currency: string): string {
	try {
		return new Intl.NumberFormat("en", { style: "currency", currency }).format(
			amount as unknown as number, // Intl accepts decimal strings and keeps them exact
		);
	} catch {
		return `${amount} ${currency}`;
	}
}

/** From this size up, `formatMoneyCompact` shortens: 10,000 and over becomes 10K, 1.2M, 3.4B. */
export const COMPACT_FROM = 10_000;
/** With the "short numbers" setting on, everything from a thousand up is shortened. */
export const COMPACT_FROM_EVERYWHERE = 1_000;

// The person's "short numbers" setting. It is set once per render by the signed-in layout (from the
// session), so every `formatMoney` call on the page follows it without each one being told.
let shortEverywhere = false;

/** Turn the "short numbers" setting on or off for what is formatted next. */
export function setShortNumbers(on: boolean): void {
	shortEverywhere = on;
}

function compactMoney(value: number, currency: string): string | null {
	try {
		return new Intl.NumberFormat("en", {
			style: "currency",
			currency,
			notation: "compact",
			maximumFractionDigits: 2,
		}).format(value);
	} catch {
		return null;
	}
}

/** An amount for display. Full ("MVR 1,234.50") unless the person turned on short numbers, which
 * shortens a thousand and over ("MVR 1.23K"). */
export function formatMoney(amount: string, currency: string): string {
	const value = Number(amount);
	if (shortEverywhere && Number.isFinite(value) && Math.abs(value) >= COMPACT_FROM_EVERYWHERE)
		return compactMoney(value, currency) ?? fullMoney(amount, currency);
	return fullMoney(amount, currency);
}

/**
 * A short form for tight places (a strip of three figures on a phone): "MVR 513.58M", "$1.2B",
 * "MVR 12K". Below ten thousand it is the full figure, cents and all, since a short form there
 * would hide detail for no gain (a thousand, with short numbers on). The short form is for reading
 * at a glance, so the full amount should stay available (a title on the element), which is what
 * `fullMoney` is for: it never shortens.
 */
export function formatMoneyCompact(amount: string, currency: string): string {
	const value = Number(amount);
	const from = shortEverywhere ? COMPACT_FROM_EVERYWHERE : COMPACT_FROM;
	if (!Number.isFinite(value) || Math.abs(value) < from) return fullMoney(amount, currency);
	return compactMoney(value, currency) ?? fullMoney(amount, currency);
}

/** The exact amount whatever the setting, for a hover title next to a short form. */
export const formatMoneyFull = fullMoney;

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

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

/** How long ago, for a list of recent activity: "just now", "5 minutes ago", "3 days ago". Past a
 * month it is the date. `now` is for tests. */
export function formatAgo(iso: string, now: number = Date.now()): string {
	const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
	if (seconds < MINUTE) return "just now";
	if (seconds < HOUR) return ago(Math.floor(seconds / MINUTE), "minute");
	if (seconds < DAY) return ago(Math.floor(seconds / HOUR), "hour");
	if (seconds < 30 * DAY) return ago(Math.floor(seconds / DAY), "day");
	return formatDate(iso);
}

/** A formatted amount taken apart so the number can stand out and the currency recede: "MVR 1,234.50"
 * is `{ currency: "MVR", number: "1,234.50" }`, "-$36.72" is `{ currency: "$", number: "-36.72" }`.
 * Text with no leading currency (a count, an unknown code written after) is all `number`. */
export function splitCurrency(text: string): { currency: string | null; number: string } {
	const match = /^(-?)([^\d\s.,-][^\d]*?)\s?(\d.*)$/u.exec(text);
	if (!match) return { currency: null, number: text };
	return { currency: match[2], number: `${match[1]}${match[3]}` };
}
