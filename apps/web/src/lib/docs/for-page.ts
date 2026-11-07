import { findDoc } from "./index";
import type { Doc } from "./types";

/**
 * Which guides explain which page, so each page's header can link to them. Keyed by the page's
 * address; an account's own page (`/accounts/<id>`) is handled apart. A page with no entry shows no
 * link. A test checks every slug names a real guide.
 */
export const GUIDES_FOR_PAGE: Record<string, readonly string[]> = {
	"/accounts": ["accounts"],
	"/transactions": ["fixing-records"],
	"/subscriptions": ["subscriptions", "varying-bills"],
	"/budget": ["budget", "goals"],
	"/plan": ["month-plan"],
	"/pending": ["salary-split"],
	"/import": ["import"],
	"/compare": ["reports"],
	"/trends": ["reports"],
	"/net-worth": ["reports"],
};

const ACCOUNT_PAGE = /^\/accounts\/[^/]+$/;

/** The guides for the page at `pathname`, in the order to show them. */
export function guidesForPath(pathname: string): Doc[] {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
	const slugs = ACCOUNT_PAGE.test(path) ? ["account-page"] : (GUIDES_FOR_PAGE[path] ?? []);
	return slugs.flatMap((slug) => findDoc(slug) ?? []);
}
