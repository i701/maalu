import Foundation

enum DueLabel {
    /// "Due today", "Due tomorrow", "Due in 5 days", "1 day overdue".
    static func text(for date: String, today: String, calendar: Calendar = .current) -> AttributedString {
        guard let day = ISODate.date(date), let now = ISODate.date(today) else { return AttributedString(date) }
        let away = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: day)).day ?? 0
        switch away {
        case 0: return AttributedString(localized: "Due today")
        case 1: return AttributedString(localized: "Due tomorrow")
        case 2...: return AttributedString(localized: "Due in \(away) days")
        default: return AttributedString(localized: "^[\(-away) day](inflect: true) overdue")
        }
    }
}
