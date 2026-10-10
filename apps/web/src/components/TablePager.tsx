import TablePagination from "@mui/material/TablePagination";
import { PAGE_SIZES } from "#/lib/pagination";

/** Pagination footer for a table card: rows per page, "1-20 of 134" and prev/next. */
export default function TablePager({
	total,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	onPrefetch,
}: {
	total: number;
	/** 1-based */
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	/** Warm up another page while the user is about to ask for it (hovering or focusing its button). */
	onPrefetch?: (page: number) => void;
}) {
	// Nothing to page through: hide it rather than show "1-4 of 4".
	if (total <= PAGE_SIZES[0]) return null;

	return (
		<TablePagination
			component="div"
			count={total}
			page={page - 1}
			rowsPerPage={pageSize}
			rowsPerPageOptions={PAGE_SIZES}
			onPageChange={(_, p) => onPageChange(p + 1)}
			onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
			labelRowsPerPage="Rows"
			showFirstButton
			showLastButton
			slotProps={{
				actions: {
					previousButton: {
						onMouseEnter: () => onPrefetch?.(page - 1),
						onFocus: () => onPrefetch?.(page - 1),
					},
					nextButton: {
						onMouseEnter: () => onPrefetch?.(page + 1),
						onFocus: () => onPrefetch?.(page + 1),
					},
				},
			}}
			sx={{
				borderTop: 1,
				borderColor: "divider",
				// Keep it on one line on phones: drop the label and spacer.
				"& .MuiTablePagination-selectLabel": { display: { xs: "none", sm: "block" } },
				"& .MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end" },
			}}
		/>
	);
}
