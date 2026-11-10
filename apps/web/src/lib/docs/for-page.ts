import { NAV_ITEMS } from "#/lib/nav";
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
	"/categories": ["categories"],
	"/tags": ["tags"],
	"/groups": ["groups"],
	"/places": ["places"],
	"/settings": ["salary-split", "backup"],
	"/compare": ["reports"],
	"/trends": ["reports"],
	"/net-worth": ["reports"],
};

const ACCOUNT_PAGE = /^\/accounts\/[^/]+$/;

/** The address of an account's own page when asked for as a docs filter (its id does not matter). */
const ACCOUNT_PAGE_KEY = "/accounts/page";

/** The value for the docs page's `for` filter that shows the guides for the page at `pathname`, or
 * null when the page has none (so no link is offered). */
export function docsFilterFor(pathname: string): string | null {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
	if (guidesForPath(path).length === 0) return null;
	return ACCOUNT_PAGE.test(path) ? ACCOUNT_PAGE_KEY : path;
}

/** The guides for the page at `pathname`, in the order to show them. */
export function guidesForPath(pathname: string): Doc[] {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
	const slugs = ACCOUNT_PAGE.test(path) ? ["account-page"] : (GUIDES_FOR_PAGE[path] ?? []);
	return slugs.flatMap((slug) => findDoc(slug) ?? []);
}

/** What to call the page at `pathname` in words ("Budget", "an account's page"). */
export function pageLabel(pathname: string): string {
	if (pathname === ACCOUNT_PAGE_KEY || ACCOUNT_PAGE.test(pathname)) return "an account's page";
	if (pathname === "/settings") return "Settings";
	return NAV_ITEMS.find((item) => item.to === pathname)?.label ?? "this page";
}
