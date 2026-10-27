/** Exact decimal arithmetic on strings, via BigInt (money is never a float). Values are scaled
 * integers: "12.5" at scale 4 is 125000n. */

const pow10 = (n: number) => 10n ** BigInt(n);

/** Parses a non-negative decimal string with at most `scale` decimals, or null. */
export function toScaled(value: string, scale: number): bigint | null {
	const v = value.trim();
	if (!/^\d+(\.\d+)?$/.test(v)) return null;
	const [int, frac = ""] = v.split(".");
	if (frac.length > scale) return null;
	return BigInt(int + frac.padEnd(scale, "0"));
}

/** Back to a decimal string with at least `minFraction` decimals (trailing zeros trimmed past it). */
export function fromScaled(n: bigint, scale: number, minFraction = 2): string {
	const negative = n < 0n;
	const digits = (negative ? -n : n).toString().padStart(scale + 1, "0");
	const whole = digits.slice(0, digits.length - scale);
	let fraction = digits.slice(digits.length - scale);
	while (fraction.length > minFraction && fraction.endsWith("0")) fraction = fraction.slice(0, -1);
	return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction.padEnd(minFraction, "0")}` : ""}`;
}

/** Integer division rounding half to even, like the API's money rounding. `d` must be positive. */
export function divRound(n: bigint, d: bigint): bigint {
	const q = n / d;
	const twice = (n % d) * 2n;
	if (twice > d || (twice === d && q % 2n === 1n)) return q + 1n;
	return q;
}

export { pow10 };
