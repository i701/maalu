import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { friendlyError } from "#/lib/use-action";
import { MAX_SELECT_ALL, type SelectionState } from "#/lib/selection";
import type { ApiResult } from "#/types/api";
import { useNotify } from "./Notify";

/**
 * Sits in the selection bar once every row on the page is selected and more match than fit on it:
 * offers to select all of them, across pages, and says so once they are.
 */
export default function SelectAllMatching({
	total,
	pageCount,
	state,
	wide,
	load,
	onLoaded,
}: {
	/** How many rows match in all (every page). */
	total: number;
	/** How many are on this page. */
	pageCount: number;
	state: SelectionState;
	/** The selection already reaches past the page. */
	wide: boolean;
	/** Fetches the ids of everything that matches. */
	load: () => Promise<ApiResult<string[]>>;
	onLoaded: (ids: string[]) => void;
}) {
	const router = useRouter();
	const notify = useNotify();
	const [loading, setLoading] = useState(false);

	async function selectAll() {
		setLoading(true);
		try {
			const res = await load();
			if (res.ok) onLoaded(res.data);
			else if (res.status === 401) await router.navigate({ to: "/login" });
			else notify(res.error, "error");
		} catch (e) {
			notify(friendlyError(e), "error");
		} finally {
			setLoading(false);
		}
	}

	if (wide)
		return (
			<Typography variant="caption">
				All {total.toLocaleString("en-GB")} matching are selected
			</Typography>
		);
	if (state !== "all" || total <= pageCount) return null;
	if (total > MAX_SELECT_ALL)
		return (
			<Typography variant="caption">
				{total.toLocaleString("en-GB")} match, which is more than can be selected at once (
				{MAX_SELECT_ALL.toLocaleString("en-GB")}). Narrow the filters to select them all.
			</Typography>
		);
	return (
		<Button
			size="small"
			color="inherit"
			sx={{ textDecoration: "underline" }}
			loading={loading}
			onClick={selectAll}
		>
			Select all {total.toLocaleString("en-GB")} matching
		</Button>
	);
}
