import { useEffect } from "react";
import { z } from "zod";

export const PAGE_SIZES = [10, 20, 50];
export const DEFAULT_PAGE_SIZE = 20;

/** `page` and `pageSize` URL search params, shared by every paginated table. Spread into the
 * route's search schema: `z.object({ ...pageSearch, other: ... })`. */
export const pageSearch = {
	page: z.number().int().min(1).default(1).catch(1),
	pageSize: z
		.number()
		.int()
		.refine((v) => PAGE_SIZES.includes(v))
		.default(DEFAULT_PAGE_SIZE)
		.catch(DEFAULT_PAGE_SIZE),
};

export type PageResult<T> = { items: T[]; total: number };

/**
 * After deleting the last row of the last page the current page is out of range. Jump back to the
 * last page that still has rows.
 */
export function useClampPage({
	page,
	pageSize,
	total,
	itemCount,
	setPage,
}: {
	page: number;
	pageSize: number;
	total: number;
	itemCount: number;
	setPage: (page: number) => void;
}) {
	useEffect(() => {
		if (itemCount === 0 && total > 0 && page > 1) {
			setPage(Math.max(1, Math.ceil(total / pageSize)));
		}
	}, [itemCount, total, page, pageSize, setPage]);
}
