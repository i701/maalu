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
