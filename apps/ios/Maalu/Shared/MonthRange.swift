import Foundation

struct MonthRange: Hashable {
    let start: Date
    let end: Date

    init(containing date: Date, calendar: Calendar = .current) {
        let interval = calendar.dateInterval(of: .month, for: date)
        start = interval?.start ?? date
        end = interval.flatMap { calendar.date(byAdding: .day, value: -1, to: $0.end) } ?? date
    }

    func shifted(by months: Int, calendar: Calendar = .current) -> MonthRange {
        MonthRange(containing: calendar.date(byAdding: .month, value: months, to: start) ?? start, calendar: calendar)
    }

    func isCurrent(now: Date = .now, calendar: Calendar = .current) -> Bool {
        calendar.isDate(start, equalTo: now, toGranularity: .month)
    }

    /// The balance chart stops today when the month is still running.
    func trendEnd(now: Date = .now) -> Date {
        min(end, now)
    }
}
