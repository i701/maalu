import { useCallback, useMemo, useState } from "react";
import {
	NO_FILTER,
	countRows,
	nameCounts,
	filterRows,
	patchRows,
	toReviewRows,
	type ReviewRow,
	type RowFilter,
	type RowPatch,
} from "#/lib/imports";
import { useSelection } from "#/lib/selection";
import type { ImportPreview } from "#/types/api";

// Rows already imported can't be acted on, so they are never part of a selection.
const pickable = (r: ReviewRow) => r.duplicate !== "reference";

/** The review's state: the rows with the user's decisions on them, what narrows them (search and
 * amount range), the page being shown and the selection on it. Everything is in the browser; a
 * statement is a few hundred rows. */
export function useReview(preview: ImportPreview) {
	const [rows, setRows] = useState(() => toReviewRows(preview));
	const [filter, setFilter] = useState<RowFilter>(NO_FILTER);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);

	const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);
	// editing can shrink what matches, so never sit past the last page
	const pageNo = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
	const shown = useMemo(
		() => filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize),
		[filtered, pageNo, pageSize],
	);
	const matching = useMemo(() => filtered.filter(pickable).map((r) => String(r.index)), [filtered]);
	const selection = useSelection(
		useMemo(() => shown.filter(pickable).map((r) => String(r.index)), [shown]),
	);

	const apply = (patch: RowPatch, sameName: boolean) => {
		const indexes = new Set(selection.selectedIds.map(Number));
		setRows((all) => patchRows(all, indexes, patch, sameName));
		if (patch.include !== undefined) selection.clear();
	};
	const patchOne = useCallback(
		(index: number, patch: RowPatch, sameName: boolean) =>
			setRows((all) => patchRows(all, new Set([index]), patch, sameName)),
		[],
	);
	const names = useMemo(() => nameCounts(rows), [rows]);
	const narrow = (next: Partial<RowFilter>) => {
		setFilter((f) => ({ ...f, ...next }));
		setPage(1);
	};

	return {
		rows,
		filter,
		filtered,
		shown,
		matching,
		selection,
		counts: countRows(rows),
		names,
		page: pageNo,
		pageSize,
		setPage,
		setPageSize: (size: number) => {
			setPageSize(size);
			setPage(1);
		},
		apply,
		patchOne,
		narrow,
		/** True when the whole page is ticked and more rows match than it shows. */
		offerAll: selection.state === "all" && !selection.wide && matching.length > shown.length,
	};
}
