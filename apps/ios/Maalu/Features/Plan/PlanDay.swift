import Foundation

/// The rows of one day, or all the overdue ones together.
struct PlanDay: Identifiable {
    let id: String
    let date: String?
    let rows: [PlanRow]

    var isOverdue: Bool { date == nil }

    /// "Overdue", "Today", "Tomorrow", or "Thu 6 Nov".
    func title(today: String, calendar: Calendar = .current) -> String {
        guard let date, let day = ISODate.date(date), let now = ISODate.date(today) else { return String(localized: "Overdue") }
        let away = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: day)).day ?? 0
        switch away {
        case 0: return String(localized: "Today")
        case 1: return String(localized: "Tomorrow")
        default: return day.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated))
        }
    }
}
