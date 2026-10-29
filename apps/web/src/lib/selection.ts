import { useState } from "react";

export type SelectionState = "none" | "some" | "all";

const EMPTY: ReadonlySet<string> = new Set();

/** The most that "select everything that matches" will take at once (the API's limit). */
export const MAX_SELECT_ALL = 5000;

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
 * longer see. The one exception is `selectAll`, for "everything that matches the filters": that
 * holds ids from other pages too, and still ends as soon as the rows on screen change.
 */
export function useSelection(ids: string[]) {
	const key = ids.join(",");
	const [stored, setStored] = useState<{ key: string; set: ReadonlySet<string>; wide: boolean }>({
		key,
		set: EMPTY,
		wide: false,
	});
	const current = stored.key === key ? stored : { key, set: EMPTY, wide: false };
	const { set: selected, wide } = current;
	const choose = (next: ReadonlySet<string>, nextWide = wide) =>
		setStored({ key, set: next, wide: nextWide });

	return {
		selected,
		/** True while the selection holds ids beyond the rows on screen ("select all matching"). */
		wide,
		/** The selected ids: the ones on screen, in row order, or every one when `wide`. */
		selectedIds: wide ? [...selected] : ids.filter((id) => selected.has(id)),
		state: selectionState(selected, ids),
		toggle: (id: string) => choose(toggleId(selected, id)),
		toggleAll: () => (wide ? choose(EMPTY, false) : choose(toggleAll(selected, ids))),
		/** Select exactly these ids, which may reach past the page. */
		selectAll: (all: string[]) => choose(new Set(all), true),
		clear: () => choose(EMPTY, false),
	};
}
