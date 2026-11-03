/** Days before a payment to be reminded: "" is never, 0 the day itself. Values are the strings of
 * the form's select; `remindFromField` turns one into what the API takes. */
export const REMIND_OPTIONS = [
	{ value: "", label: "Never" },
	{ value: "0", label: "On the day" },
	{ value: "1", label: "1 day before" },
	{ value: "2", label: "2 days before" },
	{ value: "3", label: "3 days before" },
	{ value: "5", label: "5 days before" },
	{ value: "7", label: "A week before" },
	{ value: "14", label: "2 weeks before" },
	{ value: "30", label: "A month before" },
] as const;

/** The form's select value for a subscription's reminder (a lead that is not one of the options
 * is shown as the nearest listed one at most, so an odd stored value never breaks the select). */
export function remindToField(days: number | null): string {
	if (days === null) return "";
	return REMIND_OPTIONS.some((o) => o.value === String(days)) ? String(days) : "3";
}

export const remindFromField = (value: string): number | null =>
	value === "" ? null : Number(value);

/** "3 of 12 paid" for a plan with a fixed number of payments, nothing for an ongoing one. */
export function installmentsText(total: number | null, made: number): string | null {
	return total === null ? null : `${Math.min(made, total)} of ${total} paid`;
}

/** The number of payments typed in the form: blank is an ongoing subscription (null). */
export function installmentsFromField(value: string): number | null {
	const text = value.trim();
	return text === "" ? null : Number(text);
}
