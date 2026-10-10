let displayNames: Intl.DisplayNames | null = null;
try {
	displayNames = new Intl.DisplayNames(["en"], { type: "currency" });
} catch {
	// Older runtimes without Intl.DisplayNames: names just stay blank.
}

/** English currency name for a code ("USD" -> "US Dollar"), or "" when unknown. */
export function currencyName(code: string): string {
	try {
		const name = displayNames?.of(code.toUpperCase());
		return name && name !== code.toUpperCase() ? name : "";
	} catch {
		return "";
	}
}
