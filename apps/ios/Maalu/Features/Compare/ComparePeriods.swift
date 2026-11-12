import Foundation

/// One stretch being compared: its first and last day and what to call it.
struct CompareRange: Hashable {
    let from: String
    let to: String
    let label: String
}

/// The two stretches: `now` is the one being looked at and `before` the one it is held against.
struct ComparePeriods: Hashable {
    let now: CompareRange
    let before: CompareRange
}

/// Which two periods to compare: one of the ready-made pairs, or two ranges typed in.
enum ComparePreset: String, CaseIterable, Identifiable {
    case thisMonth, lastMonth, last30, thisYear, custom

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .thisMonth: "This month"
        case .lastMonth: "Last month"
        case .last30: "Last 30 days"
        case .thisYear: "This year"
        case .custom: "Custom"
        }
    }

    /// The two periods a preset stands for on `today`. A month is the whole month (so this one is
    /// not over yet), a year is the year so far held against the same days a year before, so the
    /// two are the same length. `custom` takes the ranges as typed, or nil when they are not both
    /// complete and in order.
    static func periods(
        for preset: ComparePreset,
        on today: String,
        nowFrom: String?,
        nowTo: String?,
        beforeFrom: String?,
        beforeTo: String?
    ) -> ComparePeriods? {
        switch preset {
        case .thisMonth:
            return ComparePeriods(now: monthRange(on: today), before: monthRange(on: shiftMonth(today, by: -1)))
        case .lastMonth:
            return ComparePeriods(now: monthRange(on: shiftMonth(today, by: -1)), before: monthRange(on: shiftMonth(today, by: -2)))
        case .last30:
            return ComparePeriods(
                now: CompareRange(from: addDays(today, -29), to: today, label: String(localized: "the last 30 days")),
                before: CompareRange(from: addDays(today, -59), to: addDays(today, -30), label: String(localized: "the 30 days before"))
            )
        case .thisYear:
            guard let parts = parts(today) else { return nil }
            return ComparePeriods(
                now: CompareRange(from: iso(parts.y, 1, 1), to: today, label: "\(parts.y) so far"),
                before: CompareRange(
                    from: iso(parts.y - 1, 1, 1),
                    to: sameDayYearsAgo(today, 1),
                    label: "the same days of \(parts.y - 1)"
                )
            )
        case .custom:
            guard let nowFrom, let nowTo, let beforeFrom, let beforeTo else { return nil }
            if nowFrom > nowTo || beforeFrom > beforeTo { return nil }
            return ComparePeriods(
                now: CompareRange(from: nowFrom, to: nowTo, label: describeRange(nowFrom, nowTo)),
                before: CompareRange(from: beforeFrom, to: beforeTo, label: describeRange(beforeFrom, beforeTo))
            )
        }
    }

    // MARK: The date maths, on ISO calendar dates

    private static func pad(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }

    private static func iso(_ y: Int, _ m: Int, _ d: Int) -> String { "\(y)-\(pad(m))-\(pad(d))" }

    private static func parts(_ date: String) -> (y: Int, m: Int, d: Int)? {
        let bits = date.split(separator: "-").compactMap { Int($0) }
        guard bits.count == 3 else { return nil }
        return (bits[0], bits[1], bits[2])
    }

    private static var utc: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        return calendar
    }

    private static func date(_ isoDate: String) -> Date? {
        guard let parts = parts(isoDate) else { return nil }
        var components = DateComponents()
        components.year = parts.y
        components.month = parts.m
        components.day = parts.d
        return utc.date(from: components)
    }

    static func addDays(_ isoDate: String, _ days: Int) -> String {
        guard let date = date(isoDate), let shifted = utc.date(byAdding: .day, value: days, to: date) else { return isoDate }
        let parts = utc.dateComponents([.year, .month, .day], from: shifted)
        return iso(parts.year ?? 0, parts.month ?? 1, parts.day ?? 1)
    }

    /// The same month and day `years` earlier; 29 February becomes the 28th when that year has none.
    static func sameDayYearsAgo(_ isoDate: String, _ years: Int) -> String {
        guard let parts = parts(isoDate) else { return isoDate }
        return iso(parts.y - years, parts.m, min(parts.d, daysInMonth(parts.y - years, parts.m)))
    }

    /// The first day of the month `months` away from the one containing an ISO date.
    static func shiftMonth(_ isoDate: String, by months: Int) -> String {
        guard let parts = parts(isoDate) else { return isoDate }
        var components = DateComponents()
        components.year = parts.y
        components.month = parts.m
        components.day = 1
        guard let first = utc.date(from: components), let shifted = utc.date(byAdding: .month, value: months, to: first) else { return isoDate }
        let shiftedParts = utc.dateComponents([.year, .month], from: shifted)
        return iso(shiftedParts.year ?? 0, shiftedParts.month ?? 1, 1)
    }

    private static func daysInMonth(_ y: Int, _ m: Int) -> Int {
        var components = DateComponents()
        components.year = y
        components.month = m
        components.day = 1
        guard let first = utc.date(from: components),
              let next = utc.date(byAdding: .month, value: 1, to: first),
              let last = utc.date(byAdding: .day, value: -1, to: next)
        else { return 30 }
        return utc.component(.day, from: last)
    }

    /// "October 2026" for an ISO date.
    static func monthLabel(_ isoDate: String) -> String {
        ISODate.date(isoDate)?.formatted(.dateTime.month(.wide).year()) ?? isoDate
    }

    /// "1 Nov 2026 to 30 Nov 2026"
    static func describeRange(_ from: String, _ to: String) -> String {
        "\(formatDate(from)) to \(formatDate(to))"
    }

    private static func formatDate(_ isoDate: String) -> String {
        ISODate.date(isoDate)?.formatted(.dateTime.day().month(.abbreviated).year()) ?? isoDate
    }

    private static func monthRange(on isoDate: String) -> CompareRange {
        guard let parts = parts(isoDate) else { return CompareRange(from: isoDate, to: isoDate, label: isoDate) }
        return CompareRange(
            from: iso(parts.y, parts.m, 1),
            to: iso(parts.y, parts.m, daysInMonth(parts.y, parts.m)),
            label: monthLabel(isoDate)
        )
    }
}
