import { useMemo, useState } from "react";
import {
	lineAmount,
	newRow,
	rowsFromSplits,
	splitTotal,
	type SplitRow,
	type TaxMode,
} from "#/lib/splits";
import type { Transaction } from "#/types/api";

/** State of the "split by item and category" table. Editing an existing split transaction starts
 * with its rows (exact totals kept); a new one starts with two empty rows when switched on. */
export function useSplits(transaction: Transaction | undefined) {
	const saved = transaction && transaction.type !== "transfer" ? transaction.splits : [];
	const [enabled, setEnabled] = useState(saved.length > 0);
	const [rows, setRows] = useState<SplitRow[]>(() =>
		saved.length > 0 ? rowsFromSplits(saved) : [newRow(), newRow()],
	);
	const [mode, setModeState] = useState<TaxMode>("none");
	const [rate, setRate] = useState("");

	// Changing how GST applies recalculates every row from its typed price.
	const setMode = (next: TaxMode) => {
		setModeState(next);
		setRows((all) => all.map((r) => ({ ...r, locked: undefined })));
	};
	const changeRate = (next: string) => {
		setRate(next);
		setRows((all) => all.map((r) => ({ ...r, locked: undefined })));
	};

	const lines = useMemo(() => rows.map((r) => lineAmount(r, mode, rate)), [rows, mode, rate]);
	const total = useMemo(() => splitTotal(lines), [lines]);

	return {
		enabled,
		setEnabled,
		rows,
		setRows,
		mode,
		setMode,
		rate,
		setRate: changeRate,
		lines,
		total,
	};
}

export type SplitsState = ReturnType<typeof useSplits>;
