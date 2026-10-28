import type { BulkResult } from "#/types/api";

/** What to tell the user after a bulk action: "Moved 3 transactions to the trash", plus how many
 * were left alone and why. Nothing done at all reads as a warning, not a success. */
export function bulkMessage(
	done: (count: number) => string,
	result: BulkResult,
): { text: string; severity: "success" | "warning" } {
	const head = done(result.updated);
	if (result.skipped.length === 0) return { text: head, severity: "success" };
	const reasons = [...new Set(result.skipped.map((s) => s.reason))].join("; ");
	return { text: `${head}. ${result.skipped.length} skipped: ${reasons}`, severity: "warning" };
}

export const transactionCount = (n: number) => `${n} ${n === 1 ? "transaction" : "transactions"}`;
