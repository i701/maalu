import Foundation

/// The small sentences under a limit or goal, worked out from the API's figures.
enum BudgetText {
    /// "1,000.00 left" or "Over by 250.00".
    static func left(_ available: String, currency: String) -> String {
        guard let value = Money.decimal(available) else { return available }
        if value < 0 { return String(localized: "Over by \(MoneyFormat.string(-value, currency: currency))") }
        return String(localized: "\(MoneyFormat.string(value, currency: currency)) left")
    }

    /// "1 Nov – 31 Jan" for a monthly limit that only exists between two dates.
    static func runs(from: String?, until: String?) -> String? {
        guard let from, let until else { return nil }
        return String(localized: "Runs \(shortDate(from)) – \(shortDate(until))")
    }

    /// "1 Nov – 30 Nov · 12 days left", or when it starts or ended.
    static func window(of line: FixedBudgetLine) -> AttributedString {
        let range = "\(shortDate(line.startDate)) – \(shortDate(line.endDate))"
        switch line.state {
        case "upcoming": return AttributedString(localized: "\(range) · starts soon")
        case "ended": return AttributedString(localized: "\(range) · ended")
        default:
            guard let days = line.daysLeft else { return AttributedString(range) }
            return AttributedString(localized: "\(range) · ^[\(days) day](inflect: true) left")
        }
    }

    /// What a goal with a target date needs each month.
    static func need(of goal: Goal) -> AttributedString? {
        guard let date = goal.targetDate else { return nil }
        let months = goal.monthsLeft ?? 0
        if months == 0 { return AttributedString(localized: "Target date \(shortDate(date)) has passed") }
        let each = MoneyFormat.string(goal.neededPerMonth ?? "0", currency: goal.currency)
        return AttributedString(localized: "Needs \(each) a month for ^[\(months) more month](inflect: true)")
    }

    static func shortDate(_ iso: String) -> String {
        ISODate.date(iso)?.formatted(.dateTime.day().month(.abbreviated)) ?? iso
    }
}
