import Foundation

extension Subscription {
    var everyText: String { String(localized: intervalUnit.every(intervalCount)) }

    /// "3 of 12 paid" for a plan with a fixed number of payments, nil for one that goes on.
    var installmentsText: String? {
        installmentsTotal.map { String(localized: "\(min(paymentsMade, $0)) of \($0) paid") }
    }

    /// The line under the name: how often, then when it is next due (or that it is done).
    var dueLine: String {
        var parts = [everyText]
        switch status {
        case .completed: parts.append(String(localized: "all paid"))
        case .cancelled: parts.append(String(localized: "cancelled"))
        case .paused: parts.append(String(localized: "paused"))
        case .active:
            if let date = nextDueDate.flatMap(Self.shortDate) {
                parts.append(isOverdue ? String(localized: "overdue since \(date)") : String(localized: "next \(date)"))
            }
        }
        if let installmentsText { parts.append(installmentsText) }
        return parts.joined(separator: " · ")
    }

    var isLate: Bool { isOverdue && status == .active }

    static func shortDate(_ iso: String) -> String? {
        ISODate.date(iso)?.formatted(.dateTime.day().month(.abbreviated))
    }
}

extension SubscriptionCandidate {
    var everyText: String { String(localized: intervalUnit.every(intervalCount)) }

    var detailLine: String {
        var parts = [everyText, String(localized: "seen \(occurrences) times")]
        parts.append(isRegular ? String(localized: "looks regular") : String(localized: "looser fit"))
        if let date = Subscription.shortDate(nextDue) { parts.append(String(localized: "next \(date)")) }
        return parts.joined(separator: " · ")
    }
}
