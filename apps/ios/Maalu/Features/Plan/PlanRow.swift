import Foundation

/// One planned payment, card payment or planned income on the plan, with what is left after it.
struct PlanRow: Identifiable {
    enum Kind { case bill, income, card }

    let id: String
    let kind: Kind
    let title: String
    let date: String
    let isOverdue: Bool
    let amount: String
    let account: String?
    let subscription: String?
    /// Only a guess: its subscription's amount varies, so the real one is entered when it is paid.
    let isEstimate: Bool
    let isTransfer: Bool
    /// What is available once this is paid; nil for income, which is never counted.
    let left: Decimal?

    var isShort: Bool { (left ?? 0) < 0 }
    /// A credit card statement is paid from the card's own page, so it has no Mark as paid here.
    var canMarkPaid: Bool { kind != .card }
}
