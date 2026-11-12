import Foundation

enum DatePreset: CaseIterable, Identifiable {
    case thisMonth, lastMonth, last30Days, thisYear

    var id: Self { self }

    var title: LocalizedStringResource {
        switch self {
        case .thisMonth: "This month"
        case .lastMonth: "Last month"
        case .last30Days: "Last 30 days"
        case .thisYear: "This year"
        }
    }

    func range(now: Date = .now, calendar: Calendar = .current) -> (from: Date, to: Date) {
        switch self {
        case .thisMonth:
            return monthBounds(of: now, calendar: calendar)
        case .lastMonth:
            let lastMonth = calendar.date(byAdding: .month, value: -1, to: now) ?? now
            return monthBounds(of: lastMonth, calendar: calendar)
        case .last30Days:
            return (calendar.date(byAdding: .day, value: -29, to: now) ?? now, now)
        case .thisYear:
            return (calendar.dateInterval(of: .year, for: now)?.start ?? now, now)
        }
    }

    private func monthBounds(of date: Date, calendar: Calendar) -> (from: Date, to: Date) {
        guard let interval = calendar.dateInterval(of: .month, for: date),
              let last = calendar.date(byAdding: .day, value: -1, to: interval.end)
        else { return (date, date) }
        return (interval.start, last)
    }
}
