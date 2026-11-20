import SwiftUI

/// One card of the dashboard.
struct DashboardSectionContent: View {
    let section: DashboardSection
    let model: DashboardModel

    var body: some View {
        switch section {
        case .available:
            if let available = model.available { AvailableToSpendSection(available: available) }
        case .metrics:
            if let totals = model.totals { MonthSummarySection(totals: totals, previous: model.previousTotals) }
        case .spending:
            SpendingSection(rows: model.spendingRows, currency: model.currency)
        case .balance:
            if let summary = model.summary { NetWorthSection(summary: summary, trend: model.trend) }
        case .monthly:
            CashFlowSection(months: model.months, currency: model.currency)
        case .budget:
            BudgetGoalsSection(budget: model.budget, goals: model.goals)
        case .needsWants:
            if let shares = model.kindShares { NeedsWantsSection(shares: shares, currency: model.currency) }
        case .incomeRule:
            if let rule = model.incomeRule { IncomeRuleSection(rule: rule, currency: model.currency) }
        case .moneyFlow:
            if let flow = model.moneyFlow { MoneyFlowSection(flow: flow, currency: model.currency) }
        case .credit:
            CreditUsedSection(cards: model.creditCards)
        case .upcoming:
            TransactionsPreviewSection(title: "Coming up", transactions: model.upcoming, emptyText: "Nothing planned.")
        case .latest:
            TransactionsPreviewSection(title: "Latest transactions", transactions: model.latest, emptyText: "No transactions yet.")
        }
    }
}
