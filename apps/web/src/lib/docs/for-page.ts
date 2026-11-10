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

/**
 * What a page's "Guides" link types into the docs search, so the docs page opens with the search
 * box filled in and every guide that has to do with the page listed (the ones named in
 * `GUIDES_FOR_PAGE` and any other that mentions it). A test checks each term finds that page's own
 * guides. An account's own page uses the key `/accounts/page`.
 */
export const GUIDE_SEARCH: Record<string, string> = {
	"/accounts": "accounts",
	"/accounts/page": "account",
	"/transactions": "transactions",
	"/subscriptions": "subscriptions",
	"/budget": "budget",
	"/plan": "month plan",
	"/pending": "salary",
	"/import": "statement",
	"/categories": "categories",
	"/tags": "tags",
	"/groups": "groups",
	"/places": "places",
	"/settings": "settings",
	"/compare": "compare",
	"/trends": "trends",
	"/net-worth": "net worth",
};

/** The docs search term for the page at `pathname`, or null when the page has no guides (so no
 * "Guides" link is offered). */
export function docsSearchFor(pathname: string): string | null {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
	if (guidesForPath(path).length === 0) return null;
	return GUIDE_SEARCH[ACCOUNT_PAGE.test(path) ? "/accounts/page" : path] ?? null;
}

/** The guides for the page at `pathname`, in the order to show them. */
export function guidesForPath(pathname: string): Doc[] {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
	const slugs = ACCOUNT_PAGE.test(path) ? ["account-page"] : (GUIDES_FOR_PAGE[path] ?? []);
	return slugs.flatMap((slug) => findDoc(slug) ?? []);
}
