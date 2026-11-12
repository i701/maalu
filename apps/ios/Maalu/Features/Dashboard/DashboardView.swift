import SwiftUI

struct DashboardView: View {
    @Environment(Session.self) private var session
    @State private var model = DashboardModel()

    var body: some View {
        NavigationStack {
            List {
                if model.isCurrentMonth, let available = model.available {
                    AvailableToSpendSection(available: available)
                }
                if let totals = model.totals {
                    MonthSummarySection(totals: totals, previous: model.previousTotals)
                }
                if !model.spendingRows.isEmpty {
                    SpendingSection(rows: model.spendingRows, currency: model.currency)
                }
                if let summary = model.summary {
                    NetWorthSection(summary: summary, trend: model.trend)
                }
                if !model.months.isEmpty {
                    CashFlowSection(months: model.months, currency: model.currency)
                }
                if model.budget?.isEmpty == false || !model.goals.isEmpty {
                    BudgetGoalsSection(budget: model.budget, goals: model.goals)
                }
                if let shares = model.kindShares {
                    NeedsWantsSection(shares: shares, currency: model.currency)
                }
                if let rule = model.incomeRule {
                    IncomeRuleSection(rule: rule, currency: model.currency)
                }
                if let flow = model.moneyFlow {
                    MoneyFlowSection(flow: flow, currency: model.currency)
                }
                if !model.creditCards.isEmpty {
                    CreditUsedSection(cards: model.creditCards)
                }
                TransactionsPreviewSection(title: "Coming up", transactions: model.upcoming, emptyText: "Nothing planned.")
                TransactionsPreviewSection(title: "Latest transactions", transactions: model.latest, emptyText: "No transactions yet.")
            }
            .overlay { DashboardPlaceholder(model: model, retry: reloadNow) }
            .navigationTitle("Dashboard")
            .navigationSubtitle(Text(model.month.start, format: .dateTime.month(.wide).year()))
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    MonthSwitcher(canGoForward: !model.isCurrentMonth, previous: previousMonth, next: nextMonth)
                }
            }
            .navigationDestination(for: DashboardRoute.self) { _ in
                if let available = model.available {
                    AvailableWorkingView(available: available)
                }
            }
            .refreshable { await load() }
            .task(id: model.month) { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func previousMonth() {
        model.move(by: -1)
    }

    private func nextMonth() {
        model.move(by: 1)
    }

    private func reloadNow() {
        Task { await load() }
    }
}
