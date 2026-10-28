import type { Accent } from "#/lib/m3";

/** Where each destination sits in the sidebar. */
export const NAV_GROUPS = [
	{ key: "money", label: "Money" },
	{ key: "plan", label: "Planning" },
	{ key: "organise", label: "Organise" },
] as const;

export type NavGroupKey = (typeof NAV_GROUPS)[number]["key"];

export type NavDestination = {
	to: string;
	label: string;
	/** Material Symbols name; must exist in the bundled icon font subset (see components/Symbol.tsx) */
	symbol: string;
	accent: Accent;
	group: NavGroupKey;
	/** Also in the phone's bottom bar. That bar only has room for five, so a new destination goes in
	 * the sidebar only unless it is one of the few used all the time. */
	bottom?: boolean;
};

/** Every destination. The sidebar (wide screens) lists them all; the bottom bar (narrow screens)
 * lists the ones marked `bottom`. */
export const NAV_ITEMS: readonly NavDestination[] = [
	{
		to: "/dashboard",
		label: "Dashboard",
		symbol: "grid_view",
		accent: "lime",
		group: "money",
		bottom: true,
	},
	{
		to: "/transactions",
		label: "Transactions",
		symbol: "receipt_long",
		accent: "blue",
		group: "money",
		bottom: true,
	},
	{
		to: "/accounts",
		label: "Accounts",
		symbol: "account_balance",
		accent: "green",
		group: "money",
		bottom: true,
	},
	{
		to: "/subscriptions",
		label: "Subscriptions",
		symbol: "event_repeat",
		accent: "violet",
		group: "money",
		bottom: true,
	},
	{
		to: "/budget",
		label: "Budget",
		symbol: "savings",
		accent: "amber",
		group: "plan",
		bottom: true,
	},
	{ to: "/vendors", label: "Vendors", symbol: "storefront", accent: "orange", group: "organise" },
	{ to: "/categories", label: "Categories", symbol: "category", accent: "pink", group: "organise" },
];

export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.bottom);

/** Heights (px) the page leaves clear for the top bar and the bottom bar (bottom excludes the
 * safe-area inset), and the width of the sidebar on wide screens. */
export const TOP_BAR_HEIGHT = 64;
export const BOTTOM_BAR_HEIGHT = 80;
export const SIDEBAR_WIDTH = 264;
