import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { commitRows, plural } from "#/lib/imports";
import { useAction } from "#/lib/use-action";
import { importRowsFn } from "#/server/imports";
import type { Account, Category, ImportPreview, ImportResult, Vendor } from "#/types/api";
import TableCard from "../TableCard";
import TablePager from "../TablePager";
import AssignBar from "./AssignBar";
import ResultDialog from "./ResultDialog";
import ReviewSummary from "./ReviewSummary";
import ReviewTable from "./ReviewTable";
import ReviewToolbar from "./ReviewToolbar";
import { useReview } from "./useReview";

/** Step two: everything in the statement, with what Maalu already knows about each row. The user
 * searches and narrows the rows, gives them a vendor and category (in the row itself, or for many
 * at once from the bar), marks transfers between their own accounts, leaves some out, and imports. */
export default function ImportReview({
	preview,
	filename,
	accounts,
	categories,
	vendors,
	onClose,
}: {
	preview: ImportPreview;
	filename: string;
	accounts: Account[];
	categories: Category[];
	vendors: Vendor[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const [result, setResult] = useState<ImportResult | null>(null);
	const review = useReview(preview);
	const { selection } = review;

	const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
	const others = useMemo(
		() => accounts.filter((a) => a.id !== preview.account.id),
		[accounts, preview.account.id],
	);
	const vendorNames = useMemo(() => vendors.map((v) => v.name), [vendors]);
	const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

	async function submit() {
		await run(async () => {
			const res = await importRowsFn({
				data: {
					account_id: preview.account.id,
					filename,
					profile: preview.profile,
					rows: commitRows(review.rows),
				},
			});
			if (res.ok) setResult(res.data);
			return res;
		});
	}

	return (
		<>
			<ReviewSummary preview={preview} filename={filename} counts={review.counts} error={error} />

			<TableCard>
				<ReviewToolbar
					filter={review.filter}
					onChange={review.narrow}
					shown={review.filtered.length}
					total={review.rows.length}
					currency={preview.account.currency}
				/>
				{selection.selectedIds.length > 0 && (
					<AssignBar
						count={selection.selectedIds.length}
						vendors={vendorNames}
						categories={categoryNames}
						otherAccounts={others}
						onApply={review.apply}
						onClear={selection.clear}
						extra={
							review.offerAll && (
								<Button
									size="small"
									color="inherit"
									onClick={() => selection.selectAll(review.matching)}
								>
									Select all {review.matching.length.toLocaleString("en-GB")} matching
								</Button>
							)
						}
					/>
				)}
				{review.filtered.length === 0 ? (
					<Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
						No rows match these filters.
					</Typography>
				) : (
					<ReviewTable
						rows={review.shown}
						currency={preview.account.currency}
						accounts={byId}
						selected={selection.selected}
						selectionState={selection.state}
						onToggle={selection.toggle}
						onToggleAll={selection.toggleAll}
						vendors={vendorNames}
						categories={categoryNames}
						names={review.names}
						onPatch={review.patchOne}
					/>
				)}
				<TablePager
					total={review.filtered.length}
					page={review.page}
					pageSize={review.pageSize}
					onPageChange={review.setPage}
					onPageSizeChange={review.setPageSize}
				/>
			</TableCard>

			<Stack direction="row" sx={{ gap: 1, justifyContent: "flex-end", mt: 2 }}>
				<Button onClick={onClose} disabled={pending}>
					Cancel
				</Button>
				<Button
					variant="contained"
					onClick={submit}
					disabled={pending || review.counts.toImport === 0}
				>
					{pending ? "Importing…" : `Import ${plural(review.counts.toImport, "row")}`}
				</Button>
			</Stack>

			{result && <ResultDialog result={result} rows={review.rows} onClose={onClose} />}
		</>
	);
}
