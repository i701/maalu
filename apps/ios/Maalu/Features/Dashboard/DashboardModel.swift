import Foundation
import Observation

@MainActor @Observable
final class DashboardModel {
    var month = MonthRange(containing: .now)
    private(set) var available: AvailableToSpend?
    private(set) var totals: TransactionTotals?
    private(set) var previousTotals: TransactionTotals?
    private(set) var categories: [CategoryTotal] = []
    private(set) var summary: AccountSummary?
    private(set) var trend: [BalancePoint] = []
    private(set) var months: [MonthlyPoint] = []
    private(set) var budget: Budget?
    private(set) var goals: [Goal] = []
    private(set) var latest: [Transaction] = []
    private(set) var upcoming: [Transaction] = []
    private(set) var accounts: [Account] = []
    private(set) var currency = ""
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    static let monthsLoaded = 12
    private static let previewCount = 5

    var hasContent: Bool { totals != nil || summary != nil || !months.isEmpty }
    var isCurrentMonth: Bool { month.isCurrent() }
    var spendingRows: [SpendingRow] { SpendingRow.rows(from: categories) }
    var kindShares: [KindShare]? { KindShare.shares(from: categories) }
    var incomeRule: IncomeRule? { IncomeRule.make(from: categories) }
    var moneyFlow: MoneyFlow? { MoneyFlow.make(from: categories) }
    var creditCards: [CreditCardUsage] { CreditCardUsage.cards(from: accounts) }

    func move(by months: Int) {
        month = month.shifted(by: months)
    }

    func load(using api: Api, now: Date = .now) async {
        let current = month
        let previous = current.shifted(by: -1)
        async let totalsResult: ApiResult<TransactionTotals> = api.get("transactions/summary", query: range(current))
        async let previousResult: ApiResult<TransactionTotals> = api.get("transactions/summary", query: range(previous))
        async let categoriesResult: ApiResult<CategoryTotals> = api.get("transactions/categories", query: range(current))
        async let availableResult: ApiResult<AvailableToSpend> = api.get("stats/available-to-spend")
        async let summaryResult: ApiResult<AccountSummary> = api.get("accounts/summary")
        async let trendResult: ApiResult<BalanceTrend> = api.get("stats/balance-trend", query: [
            URLQueryItem(name: "from", value: ISODate.string(current.start)),
            URLQueryItem(name: "to", value: ISODate.string(current.trendEnd(now: now))),
        ])
        async let monthsResult: ApiResult<MonthlyStats> = api.get("stats/monthly", query: [
            URLQueryItem(name: "months", value: String(Self.monthsLoaded)),
            URLQueryItem(name: "to", value: ISODate.string(current.end)),
        ])
        async let budgetResult: ApiResult<Budget> = api.get("budget", query: [
            URLQueryItem(name: "on", value: ISODate.string(current.start)),
        ])
        async let goalsResult: ApiResult<[Goal]> = api.get("goals")
        async let latestResult: ApiResult<[Transaction]> = api.get("transactions", query: [
            URLQueryItem(name: "limit", value: String(Self.previewCount)),
        ])
        async let upcomingResult: ApiResult<[Transaction]> = api.get("transactions", query: [
            URLQueryItem(name: "planned", value: "true"),
            URLQueryItem(name: "limit", value: String(Self.previewCount)),
        ])
        async let accountsResult: ApiResult<[Account]> = api.get("accounts")

        let (totals, previousTotals, categories, available) = await (totalsResult, previousResult, categoriesResult, availableResult)
        let (summary, trend, months, budget) = await (summaryResult, trendResult, monthsResult, budgetResult)
        let (goals, latest, upcoming, accounts) = await (goalsResult, latestResult, upcomingResult, accountsResult)
        guard !Task.isCancelled else { return }
        isLoading = false

        self.totals = value(totals)
        self.previousTotals = value(previousTotals)
        self.categories = value(categories)?.categories ?? []
        self.available = value(available)
        self.summary = value(summary)
        self.trend = value(trend)?.points ?? []
        self.months = value(months)?.months ?? []
        self.budget = value(budget)
        self.goals = value(goals) ?? []
        self.latest = value(latest) ?? []
        self.upcoming = value(upcoming) ?? []
        self.accounts = value(accounts) ?? []
        currency = self.totals?.currency ?? self.summary?.currency ?? ""
        errorMessage = hasContent ? nil : [failure(totals), failure(summary)].compactMap { $0 }.first
    }

    private func range(_ month: MonthRange) -> [URLQueryItem] {
        [
            URLQueryItem(name: "date_from", value: ISODate.string(month.start)),
            URLQueryItem(name: "date_to", value: ISODate.string(month.end)),
        ]
    }

    private func value<T>(_ result: ApiResult<T>) -> T? {
        if case .ok(let value, _) = result { value } else { nil }
    }

    private func failure<T>(_ result: ApiResult<T>) -> String? {
        if case .failed(_, let message) = result { message } else { nil }
    }
}
