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
 * After deleting the last row of the last page the current page is out of range. Returns the last
 * page that still has rows, or null when the page is fine. Call it in a route loader and redirect.
 */
export function lastPageIfOutOfRange({
	page,
	pageSize,
	total,
	itemCount,
}: {
	page: number;
	pageSize: number;
	total: number;
	itemCount: number;
}): number | null {
	return itemCount === 0 && total > 0 && page > 1 ? Math.max(1, Math.ceil(total / pageSize)) : null;
}
