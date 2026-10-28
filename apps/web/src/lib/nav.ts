/** Main destinations for the bottom navigation bar. Symbols must exist in the bundled icon font
 * subset (see components/Symbol.tsx). */
export const NAV_ITEMS = [
	{ to: "/transactions", label: "Transactions", symbol: "receipt_long", accent: "blue" },
	{ to: "/accounts", label: "Accounts", symbol: "account_balance", accent: "green" },
	{ to: "/subscriptions", label: "Subscriptions", symbol: "event_repeat", accent: "violet" },
	{ to: "/budget", label: "Budget", symbol: "savings", accent: "amber" },
	{ to: "/vendors", label: "Vendors", symbol: "storefront", accent: "orange" },
] as const;

/** Heights (px) the page leaves clear for the top bar and the bottom bar (bottom excludes the
 * safe-area inset). */
export const TOP_BAR_HEIGHT = 64;
export const BOTTOM_BAR_HEIGHT = 80;
