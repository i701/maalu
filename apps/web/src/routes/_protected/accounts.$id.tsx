import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import AccountActions from "#/components/account/AccountActions";
import AccountBalanceChart from "#/components/account/AccountBalanceChart";
import AccountCards from "#/components/account/AccountCards";
import AccountPlanned from "#/components/account/AccountPlanned";
import AccountSummary from "#/components/account/AccountSummary";
import AccountTransactionList from "#/components/account/AccountTransactionList";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import { RouterLink } from "#/components/RouterLinks";
import { DEFAULT_HISTORY_RANGE, balanceMap } from "#/lib/account-detail";
import { accountIdentity } from "#/lib/accounts";
import { repaymentSeed } from "#/lib/cards";
import { monthBounds, monthLabel } from "#/lib/dashboard";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { localToday } from "#/lib/planned";
import { unwrap } from "#/lib/unwrap";
import {
	getAccountFn,
	getBalanceHistoryFn,
	getBalancesAfterFn,
	listAccountsFn,
} from "#/server/accounts";
import { listCategoriesFn } from "#/server/categories";
import { listCurrenciesFn } from "#/server/currencies";
import { listSubscriptionsFn } from "#/server/subscriptions";
import { listCardsFn } from "#/server/cards";
import { listTagsFn } from "#/server/tags";
import { listTemplatesFn } from "#/server/templates";
import { getTransactionTotalsFn, listTransactionsFn, listUpcomingFn } from "#/server/transactions";
import { listVendorsFn } from "#/server/vendors";
import { ACCOUNT_GROUP_LABELS, TRANSACTION_TYPES, type Card } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	// coerce: the router parses a typed ?q=2026 as a number, which should still be a search
	q: z.coerce.string().max(100).optional().catch(undefined),
	type: z.enum(TRANSACTION_TYPES).optional().catch(undefined),
	date_from: z.iso.date().optional().catch(undefined),
	date_to: z.iso.date().optional().catch(undefined),
	// how far back the balance chart goes
	days: z
		.union([z.literal(30), z.literal(90), z.literal(365)])
		.optional()
		.catch(undefined),
});

export const Route = createFileRoute("/_protected/accounts/$id")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ params, deps }) => {
		if (!z.uuid().safeParse(params.id).success) throw notFound();
		const today = localToday();
		const month = monthBounds(today);
		const [
			account,
			list,
			totals,
			upcoming,
			vendors,
			subscriptions,
			accounts,
			templates,
			tags,
			categories,
			currencies,
			cards,
			history,
			balancesAfter,
		] = await Promise.all([
			getAccountFn({ data: { id: params.id } }),
			listTransactionsFn({ data: { ...deps, account_id: params.id } }),
			getTransactionTotalsFn({
				data: { account_id: params.id, date_from: month.start, date_to: month.end },
			}),
			listUpcomingFn(),
			listVendorsFn(),
			listSubscriptionsFn(),
			listAccountsFn(),
			listTemplatesFn(),
			listTagsFn(),
			listCategoriesFn(),
			listCurrenciesFn(),
			listCardsFn(),
			getBalanceHistoryFn({ data: { id: params.id, days: deps.days ?? DEFAULT_HISTORY_RANGE } }),
			getBalancesAfterFn({ data: { id: params.id } }),
		]);
		if (!account.ok && account.status === 404) throw notFound();
		const rows = unwrap(list);
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		// e.g. the last row of the last page was deleted: land on the last page that has rows
		if (last)
			throw redirect({
				to: "/accounts/$id",
				params: { id: params.id },
				search: { ...deps, page: last },
			});
		return {
			account: unwrap(account),
			...rows,
			history: unwrap(history),
			balances: balanceMap(balancesAfter.ok ? balancesAfter.data : []),
			totals: unwrap(totals),
			// planned ones that touch this account, soonest first (the API already orders them)
			planned: (upcoming.ok ? upcoming.data : []).filter(
				(t) => t.account?.id === params.id || t.to_account?.id === params.id,
			),
			today,
			month: monthLabel(month.start),
			lists: {
				vendors: unwrap(vendors),
				subscriptions: unwrap(subscriptions),
				accounts: unwrap(accounts),
				cards: unwrap(cards),
				templates: unwrap(templates),
				tags: unwrap(tags),
				categories: unwrap(categories),
				currencies,
			},
		};
	},
	notFoundComponent: () => (
		<EmptyState symbol="account_balance" accent="slate">
			There is no account with that address.{" "}
			<RouterLink to="/accounts">See your accounts</RouterLink>
		</EmptyState>
	),
	component: AccountPage,
});

function AccountPage() {
	const { account, items, total, totals, planned, today, month, lists, history, balances } =
		Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [adding, setAdding] = useState(false);
	const [repaying, setRepaying] = useState<Card | null>(null);
	const identity = accountIdentity(account);
	const archived = account.archived_at !== null;

	return (
		<>
			<PageHeader
				title={account.name}
				symbol="account_balance"
				accent="green"
				shape={1}
				stats={[
					{ symbol: "category", label: ACCOUNT_GROUP_LABELS[account.group] },
					{ symbol: "payments", label: account.currency },
					...(archived ? [{ symbol: "inventory_2", label: "Archived" }] : []),
				]}
				description={[identity, account.description].filter(Boolean).join(" · ") || "An account"}
				action={
					<AccountActions
						account={account}
						accounts={lists.accounts}
						currencies={lists.currencies}
						baseCurrency={user.base_currency}
						onAdd={() => setAdding(true)}
					/>
				}
			/>
			<AccountSummary
				account={account}
				totals={totals}
				baseCurrency={user.base_currency}
				monthLabel={month}
			/>
			<AccountBalanceChart
				history={history}
				days={search.days ?? DEFAULT_HISTORY_RANGE}
				onDays={(days) => navigate({ search: (p) => ({ ...p, days }), replace: true })}
			/>
			<AccountPlanned items={planned} accountId={account.id} today={today} />
			<AccountCards
				account={account}
				accounts={lists.accounts}
				cards={lists.cards}
				onRepay={setRepaying}
			/>
			<AccountTransactionList
				account={account}
				items={items}
				total={total}
				page={search.page}
				pageSize={search.pageSize}
				filters={search}
				lists={{ ...lists, baseCurrency: user.base_currency }}
				balances={balances}
				adding={adding || repaying !== null}
				seed={repaying ? (repaymentSeed(repaying) ?? undefined) : undefined}
				onAddingDone={() => {
					setAdding(false);
					setRepaying(null);
				}}
				onFilters={(change) => navigate({ search: (p) => ({ ...p, ...change, page: 1 }) })}
				onPage={(page) => navigate({ search: (p) => ({ ...p, page }), replace: true })}
				onPageSize={(pageSize) => navigate({ search: (p) => ({ ...p, pageSize, page: 1 }) })}
			/>
		</>
	);
}
