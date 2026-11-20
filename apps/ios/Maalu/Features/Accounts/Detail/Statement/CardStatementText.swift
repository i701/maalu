import Foundation

/// How a statement reads, like the web's `lib/card-statement.ts`.
enum CardStatementText {
    enum Tone {
        case ok, warn, late, quiet
    }

    /// "5th", "22nd": the day of the month as it is said.
    static func ordinal(_ day: Int) -> String {
        day.formatted(.number.grouping(.never)) + suffix(day)
    }

    private static func suffix(_ day: Int) -> String {
        if (11...13).contains(day % 100) { return "th" }
        switch day % 10 {
        case 1: return "st"
        case 2: return "nd"
        case 3: return "rd"
        default: return "th"
        }
    }

    /// "in 4 days", "tomorrow", "today", "3 days ago".
    static func dueIn(_ days: Int) -> String {
        switch days {
        case 0: String(localized: "today")
        case 1: String(localized: "tomorrow")
        case -1: String(localized: "yesterday")
        case 2...: String(localized: "in \(days) days")
        default: String(localized: "\(-days) days ago")
        }
    }

    /// A label for the chip and a tone for its colour.
    static func status(_ statement: CardStatement) -> (label: String, tone: Tone) {
        switch statement.state {
        case .overdue: (String(localized: "Payment overdue"), .late)
        case .due: statement.daysUntilDue <= 3 ? (String(localized: "Due soon"), .warn) : (String(localized: "To pay"), .ok)
        case .paid: (String(localized: "Paid"), .ok)
        case .none: (String(localized: "Nothing to pay"), .quiet)
        }
    }

    /// The one line for a card on the Accounts list: "Pay MVR 600.00 by 12 Nov (in 4 days)".
    static func line(_ statement: CardStatement) -> String {
        let money = { MoneyFormat.string($0, currency: statement.currency) }
        switch statement.state {
        case .overdue:
            return String(localized: "\(money(statement.remaining)) was due \(day(statement.dueOn)) (\(dueIn(statement.daysUntilDue)))")
        case .due:
            return String(localized: "Pay \(money(statement.remaining)) by \(day(statement.dueOn)) (\(dueIn(statement.daysUntilDue)))")
        case .paid:
            return String(localized: "Statement of \(money(statement.statementBalance)) paid")
        case .none:
            return String(localized: "Nothing to pay. Next statement closes \(day(statement.nextClosesOn))")
        }
    }

    /// "Closes on the 5th, due on the 25th".
    static func schedule(_ statement: CardStatement) -> String {
        String(localized: "Closes on the \(ordinal(statement.statementDay)), due on the \(ordinal(statement.dueDay))")
    }

    static func day(_ iso: String) -> String {
        ISODate.date(iso)?.formatted(.dateTime.day().month(.abbreviated)) ?? iso
    }
}
