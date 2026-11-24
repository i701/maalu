/** Which end of a transfer: the account the money leaves, or the one it goes to. */
export type TransferSide = "from" | "to";

/** The two accounts of a transfer, by id ("" for none yet). */
export type TransferEnds = { from: string; to: string };

/** The two ends traded: the account the money goes to becomes the one it leaves. An end that has
 * no account yet trades too, so a lone account moves to the other side. */
export const swapTransferEnds = (ends: TransferEnds): TransferEnds => ({
	from: ends.to,
	to: ends.from,
});

/**
 * The ends of a transfer once `id` is picked on one side. An account cannot be on both sides, so
 * picking the one already on the other side swaps them instead (the same as the swap arrow).
 */
export function pickTransferEnd(ends: TransferEnds, side: TransferSide, id: string): TransferEnds {
	const other = side === "from" ? ends.to : ends.from;
	if (id !== "" && id === other) return swapTransferEnds(ends);
	return side === "from" ? { from: id, to: ends.to } : { from: ends.from, to: id };
}

/** Whether `next` is `before` with its two ends traded. */
export const isSwap = (before: TransferEnds, next: TransferEnds) =>
	before.from !== before.to && next.from === before.to && next.to === before.from;

/**
 * The typed amounts after the two ends trade places. Between two currencies what left one account
 * is what arrived in the other, so the figures trade too; in one currency there is only one amount
 * and it stays.
 */
export function swapTransferAmounts(
	amounts: { amount: string; to_amount: string },
	crossCurrency: boolean,
) {
	return crossCurrency ? { amount: amounts.to_amount, to_amount: amounts.amount } : amounts;
}
