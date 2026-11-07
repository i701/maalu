import { formatMoney } from "./format";
import type { AvailableToSpend } from "#/types/api";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Below zero: the bills and set-asides come to more than the accounts hold. */
export const isShort = (a: Pick<AvailableToSpend, "available">): boolean => Number(a.available) < 0;

/** The sum in words, so the number can be checked at a glance:
 * "MVR 5,200.00 in 2 accounts, less MVR 420.00 for 2 bills and MVR 1,000.00 set aside for 1 goal". */
export function workingLine(a: AvailableToSpend): string {
	const money = (v: string) => formatMoney(v, a.currency);
	const parts = [`${money(a.balance)} in ${plural(a.accounts.length, "account", "accounts")}`];
	const less: string[] = [];
	if (a.bills.length > 0)
		less.push(`${money(a.bills_total)} for ${plural(a.bills.length, "bill", "bills")}`);
	if (a.card_payments.length > 0)
		less.push(
			`${money(a.card_payments_total)} for ${plural(a.card_payments.length, "card statement", "card statements")}`,
		);
	if (a.reserved.length > 0)
		less.push(
			`${money(a.reserved_total)} set aside for ${plural(a.reserved.length, "goal", "goals")}`,
		);
	return less.length > 0 ? `${parts[0]}, less ${less.join(" and ")}` : parts[0];
}

/** Whether there is anything to say beyond the number (an empty account shows a short prompt). */
export const hasAccounts = (a: Pick<AvailableToSpend, "accounts">): boolean =>
	a.accounts.length > 0;
