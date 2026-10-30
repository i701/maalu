const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The toast after a restore: "Restored 3 accounts and 250 transactions". */
export function restoredMessage(restored: Record<string, number>): string {
	const accounts = restored.accounts ?? 0;
	const transactions = restored.transactions ?? 0;
	if (accounts === 0 && transactions === 0) return "Restored, but the backup was empty";
	return `Restored ${plural(accounts, "account", "accounts")} and ${plural(transactions, "transaction", "transactions")}`;
}
