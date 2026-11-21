import Foundation
import Observation

@MainActor @Observable
final class DashboardModel {
    var month = MonthRange(containing: .now)
    private(set) var available: AvailableToSpend?
    private(set) var totals: TransactionTotals?
    private(set) var previousTotals: TransactionTotals?
    private(set) var categories: [CategoryTotal] = []
    private(set) var categoryMonths: CategoryMonths?
    private(set) var summary: AccountSummary?
    private(set) var trend: [BalancePoint] = []
    private(set) var months: [MonthlyPoint] = []
    private(set) var budget: Budget?
    private(set) var goals: [Goal] = []
    private(set) var latest: [Transaction] = []
    private(set) var upcoming: [Transaction] = []
    private(set) var accounts: [Account] = []
    private(set) var currency = ""
    /// The order the person saved, or nil for the default one.
    /// What to call the person, for the greeting.
    private(set) var name: String?
    private(set) var savedOrder: [String]?
    /// The cards switched off. Kept on this device, not on the server, so the web and Android do not know them yet.
    private(set) var hidden: Set<DashboardSection>
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    static let monthsLoaded = 12
    private static let previewCount = 5
    private static let hiddenKey = "dashboardHiddenSections"

    @ObservationIgnored private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        hidden = Set((defaults.stringArray(forKey: Self.hiddenKey) ?? []).compactMap(DashboardSection.init(rawValue:)))
    }

    var hasContent: Bool { totals != nil || summary != nil || !months.isEmpty }
    var isCurrentMonth: Bool { month.isCurrent() }
    var spendingRows: [SpendingRow] { SpendingRow.rows(from: categories) }
    var kindShares: [KindShare]? { KindShare.shares(from: categories) }
    var incomeRule: IncomeRule? { IncomeRule.make(from: categories) }
    var moneyFlow: MoneyFlow? { MoneyFlow.make(from: categories) }
    var creditCards: [CreditCardUsage] { CreditCardUsage.cards(from: accounts) }

    /// The cards that have something to show, in the default order. A card with nothing behind it is left out, as on the web.
    var shownSections: [DashboardSection] {
        DashboardSection.allCases.filter { section in
            switch section {
            case .available: isCurrentMonth && available != nil
            case .metrics: totals != nil
            case .spending: !spendingRows.isEmpty
            case .spendingTrend: SpendingStack.make(from: categoryMonths ?? CategoryMonths.empty, last: Self.monthsLoaded) != nil
            case .balance: summary != nil
            case .monthly: !months.isEmpty
            case .budget: budget?.isEmpty == false || !goals.isEmpty
            case .needsWants: kindShares != nil
            case .incomeRule: incomeRule != nil
            case .moneyFlow: moneyFlow != nil
            case .credit: !creditCards.isEmpty
            case .upcoming, .latest: true
            }
        }
    }

    /// Every card that has something to show, in the saved order, the switched-off ones too: what the arrange sheet lists.
    var arrangeableSections: [DashboardSection] {
        DashboardSection.ordered(saved: savedOrder, visible: shownSections)
    }

    var orderedSections: [DashboardSection] {
        arrangeableSections.filter { !hidden.contains($0) }
    }

    /// The cards for the deck at the top, and the ones that scroll below it, in the saved order.
    var deckSections: [DashboardSection] { orderedSections.filter(\.isInDeck) }
    var listSections: [DashboardSection] { orderedSections.filter { !$0.isInDeck } }

    /// Saves the order (nil goes back to the default one) and which cards are switched off. Returns a message when the server refused the order.
    func saveLayout(order: [DashboardSection]?, hidden: Set<DashboardSection>, using api: Api) async -> String? {
        let ids = order?.map(\.rawValue)
        let result: ApiResult<Profile> = await api.patchJSON("users/me", body: ["dashboard_order": ids])
        if case .failed(_, let message) = result { return message }
        savedOrder = ids
        setHidden(hidden)
        return nil
    }

    func setHidden(_ sections: Set<DashboardSection>) {
        hidden = sections
        defaults.set(sections.map(\.rawValue).sorted(), forKey: Self.hiddenKey)
    }

    func move(by months: Int) {
        month = month.shifted(by: months)
    }

    func load(using api: Api, now: Date = .now) async {
        let current = month
        let previous = current.shifted(by: -1)
        async let totalsResult: ApiResult<TransactionTotals> = api.get("transactions/summary", query: range(current))
        async let previousResult: ApiResult<TransactionTotals> = api.get("transactions/summary", query: range(previous))
        async let categoriesResult: ApiResult<CategoryTotals> = api.get("transactions/categories", query: range(current))
        async let categoryMonthsResult: ApiResult<CategoryMonths> = api.get("transactions/categories/monthly", query: [
            URLQueryItem(name: "date_from", value: ISODate.string(current.shifted(by: 1 - Self.monthsLoaded).start)),
            URLQueryItem(name: "date_to", value: ISODate.string(current.end)),
        ])
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
        async let profileResult: ApiResult<Profile> = api.get("users/me")

        let (totals, previousTotals, categories, available) = await (totalsResult, previousResult, categoriesResult, availableResult)
        let (summary, trend, months, budget) = await (summaryResult, trendResult, monthsResult, budgetResult)
        let (goals, latest, upcoming, accounts) = await (goalsResult, latestResult, upcomingResult, accountsResult)
        let profile = await profileResult
        let categoryMonths = await categoryMonthsResult
        guard !Task.isCancelled else { return }
        isLoading = false

        self.totals = value(totals)
        self.previousTotals = value(previousTotals)
        self.categories = value(categories)?.categories ?? []
        self.categoryMonths = value(categoryMonths)
        self.available = value(available)
        self.summary = value(summary)
        self.trend = value(trend)?.points ?? []
        self.months = value(months)?.months ?? []
        self.budget = value(budget)
        self.goals = value(goals) ?? []
        self.latest = value(latest) ?? []
        self.upcoming = value(upcoming) ?? []
        self.accounts = value(accounts) ?? []
        if let profile = value(profile) {
            savedOrder = profile.dashboardOrder
            name = profile.name
        }
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
