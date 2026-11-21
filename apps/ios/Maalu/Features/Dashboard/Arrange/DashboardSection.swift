import Foundation

/// A card on the dashboard. The ids are the web's, so one saved order (`users.dashboard_order`) arranges both; `incomeRule` and `spendingTrend` are iOS only.
enum DashboardSection: String, CaseIterable, Identifiable {
    case available
    case metrics
    case spending
    case spendingTrend = "spending-trend"
    case balance
    case monthly
    case budget
    case needsWants = "needs-wants"
    case incomeRule = "income-rule"
    case moneyFlow = "money-flow"
    case credit
    case upcoming
    case latest

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .available: "Available to spend"
        case .metrics: "Income, spent and saved"
        case .spending: "Spending by category"
        case .spendingTrend: "Spending by month"
        case .balance: "Net worth"
        case .monthly: "Month by month"
        case .budget: "Budget and goals"
        case .needsWants: "Needs and wants"
        case .incomeRule: "Income rule"
        case .moneyFlow: "Money flow"
        case .credit: "Credit usage"
        case .upcoming: "Coming up"
        case .latest: "Latest transactions"
        }
    }

    /// Applies a saved order to the cards on show: ids the save does not know go last in default order, and saved ids that are not on show are skipped,
    /// so a card that appears later never breaks anyone's layout. Ported from the web's `orderSections`.
    static func ordered(saved: [String]?, visible: [DashboardSection]) -> [DashboardSection] {
        let rank = Dictionary((saved ?? []).enumerated().map { ($1, $0) }, uniquingKeysWith: { first, _ in first })
        let unsaved = rank.count
        // sorted(by:) is not stable, so ties are broken by the default order
        return visible.enumerated()
            .sorted { (rank[$0.element.rawValue] ?? unsaved, $0.offset) < (rank[$1.element.rawValue] ?? unsaved, $1.offset) }
            .map(\.element)
    }
}
