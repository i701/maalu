import type { Accent } from "#/lib/m3";

/** Where each destination sits in the sidebar. */
export const NAV_GROUPS = [
	{ key: "money", label: "Money" },
	{ key: "plan", label: "Planning" },
	{ key: "organise", label: "Organise" },
	{ key: "help", label: "Help" },
] as const;

export type NavGroupKey = (typeof NAV_GROUPS)[number]["key"];

export type NavDestination = {
	to: string;
	label: string;
	/** Material Symbols name; must exist in the bundled icon font subset (see components/Symbol.tsx) */
	symbol: string;
	accent: Accent;
	group: NavGroupKey;
	/** Also in the phone's bottom bar. It has four of these plus More, which opens every destination,
	 * so a new destination needs no `bottom` unless it is one of the few used all the time. */
	bottom?: boolean;
};

/** Every destination. The sidebar (wide screens) lists them all; the bottom bar (narrow screens)
 * lists the ones marked `bottom`, and its More sheet lists them all again, grouped. */
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
	},
	{ to: "/net-worth", label: "Net worth", symbol: "finance", accent: "green", group: "money" },
	{ to: "/compare", label: "Compare", symbol: "insights", accent: "violet", group: "money" },
	{ to: "/trends", label: "Trends", symbol: "calendar_month", accent: "lime", group: "money" },
	{ to: "/import", label: "Import", symbol: "upload_file", accent: "orange", group: "money" },
	{ to: "/places", label: "Places", symbol: "location_on", accent: "pink", group: "money" },
	{
		to: "/budget",
		label: "Budget",
		symbol: "savings",
		accent: "amber",
		group: "plan",
		bottom: true,
	},
	{ to: "/plan", label: "Month plan", symbol: "checklist", accent: "amber", group: "plan" },
	{ to: "/pending", label: "Pending", symbol: "task_alt", accent: "orange", group: "plan" },
	{ to: "/vendors", label: "Vendors", symbol: "storefront", accent: "orange", group: "organise" },
	{ to: "/categories", label: "Categories", symbol: "category", accent: "pink", group: "organise" },
	{ to: "/tags", label: "Tags", symbol: "sell", accent: "violet", group: "organise" },
	{ to: "/groups", label: "Groups", symbol: "inventory_2", accent: "blue", group: "organise" },
	{ to: "/templates", label: "Templates", symbol: "bookmark", accent: "lime", group: "organise" },
	{ to: "/trash", label: "Trash", symbol: "delete", accent: "slate", group: "organise" },
	{ to: "/docs", label: "Docs", symbol: "article", accent: "blue", group: "help" },
];

export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.bottom);

/** Whether `pathname` is one of the bottom bar's own destinations (or a page under one, like an
 * account's page under Accounts). When it is not, the More button shows as the current tab. */
export const inBottomBar = (pathname: string): boolean =>
	BOTTOM_NAV_ITEMS.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

/** Heights (px) the page leaves clear for the top bar and the bottom bar (bottom excludes the
 * safe-area inset), and the width of the sidebar on wide screens. */
export const TOP_BAR_HEIGHT = 64;
export const BOTTOM_BAR_HEIGHT = 80;
export const SIDEBAR_WIDTH = 264;
