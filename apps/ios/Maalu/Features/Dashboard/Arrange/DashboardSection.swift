import Foundation

/// A card on the dashboard. The raw values are what is saved on the device, so do not rename them.
enum DashboardSection: String, CaseIterable, Identifiable {
    case metrics
    case moneyFlow = "money-flow"
    case available
    case spending
    case balance
    case monthly
    case budget
    case needsWants = "needs-wants"
    case incomeRule = "income-rule"
    case credit
    case upcoming
    case latest
    case spendingTrend = "spending-trend"

    var id: String { rawValue }

    /// The cards that go in the deck at the top of the Dashboard, in the saved order among themselves; the rest scroll below it.
    var isInDeck: Bool { self == .available || self == .metrics }

    var title: LocalizedStringResource {
        switch self {
        case .available: "Available to spend"
        case .metrics: "Income, spent and saved"
        case .spending: "Spending by category"
        case .spendingTrend: "Spending by month"
        case .balance: "Net worth"
        case .monthly: "Cash flow"
        case .budget: "Budget and goals"
        case .needsWants: "Needs and wants"
        case .incomeRule: "Income rule"
        case .moneyFlow: "Money flow"
        case .credit: "Credit used"
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
