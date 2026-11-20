import Foundation

/// The figures behind the Trends table, ported from the web's `lib/trends.ts`.
enum TrendsMath {
    static let ranges = [6, 12, 24]

    /// The first and last day to ask for so the table ends with the month `today` is in and spans `months` months.
    static func bounds(months: Int, today: String) -> (from: String, to: String) {
        let first = ComparePreset.shiftMonth(today, by: -(months - 1))
        let last = ComparePreset.addDays(ComparePreset.shiftMonth(today, by: 1), -1)
        return (first, last)
    }

    /// "Mar 26" for "2026-03": short enough for a narrow column, with the year so a long range reads.
    static func monthColumn(_ month: String) -> String {
        guard let date = ISODate.date("\(month)-01") else { return month }
        return date.formatted(.dateTime.month(.abbreviated).year(.twoDigits))
    }

    /// What every row came to in each month, added up exactly, for the footer.
    static func columnTotals(_ rows: [CategoryMonthRow], count: Int) -> [Decimal] {
        (0..<count).map { month in rows.reduce(0) { $0 + $1.value(at: month) } }
    }

    /// How strongly to shade a cell: its share of the biggest figure in the table, 0 to 1. A refund and an empty month are not shaded.
    static func heat(_ value: Decimal, max biggest: Decimal) -> Double {
        guard value > 0, biggest > 0 else { return 0 }
        return min(1, NSDecimalNumber(decimal: value / biggest).doubleValue)
    }

    /// The biggest single month in the table, for scaling the shading.
    static func maxCell(_ rows: [CategoryMonthRow]) -> Decimal {
        rows.flatMap(\.values).max() ?? 0
    }

    /// What a category averages over the months shown (display only).
    static func monthlyAverage(_ row: CategoryMonthRow) -> Decimal {
        row.totalValue / Decimal(max(row.amounts.count, 1))
    }

    /// A figure for a narrow cell: no currency, two decimals until it is large enough not to need them, "–" for nothing.
    static func cellText(_ value: Decimal) -> String {
        if value == 0 { return "–" }
        return value.formatted(.number.precision(.fractionLength(abs(value) >= 1000 ? 0 : 2)))
    }
}
