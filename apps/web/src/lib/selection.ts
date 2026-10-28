import { useState } from "react";

export type SelectionState = "none" | "some" | "all";

const EMPTY: ReadonlySet<string> = new Set();

export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
	const next = new Set(selected);
	if (!next.delete(id)) next.add(id);
	return next;
}

/** Everything when not everything is selected yet, otherwise nothing. */
export function toggleAll(selected: ReadonlySet<string>, ids: string[]): Set<string> {
	return selectionState(selected, ids) === "all" ? new Set() : new Set(ids);
}

export function selectionState(selected: ReadonlySet<string>, ids: string[]): SelectionState {
	const count = ids.filter((id) => selected.has(id)).length;
	if (count === 0) return "none";
	return count === ids.length ? "all" : "some";
}

/**
 * Row selection for a list. The selection belongs to the rows on screen: when they change (another
 * page, a filter, a deletion) it starts empty again, so an action never reaches a row you can no
 * longer see.
 */
export function useSelection(ids: string[]) {
	const key = ids.join(",");
	const [stored, setStored] = useState<{ key: string; set: ReadonlySet<string> }>({
		key,
		set: EMPTY,
	});
	const selected = stored.key === key ? stored.set : EMPTY;
	const set = (next: ReadonlySet<string>) => setStored({ key, set: next });

	return {
		selected,
		/** The selected ids, in the order of the rows. */
		selectedIds: ids.filter((id) => selected.has(id)),
		state: selectionState(selected, ids),
		toggle: (id: string) => set(toggleId(selected, id)),
		toggleAll: () => set(toggleAll(selected, ids)),
		clear: () => set(EMPTY),
	};
}
