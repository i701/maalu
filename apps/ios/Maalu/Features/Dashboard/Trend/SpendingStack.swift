import SwiftUI

/// Spending per month stacked by category, for the last few months: the biggest few categories over the whole span, everything else folded into one "Other". A refund that outweighs a month's spending in a category counts as nothing there, so a bar never goes below the baseline.
struct SpendingStack {
    let months: [SpendingStackMonth]
    /// The categories drawn, biggest first; the last is "Other" when `hasOther`.
    let names: [String]
    let hasOther: Bool

    func color(at rank: Int) -> Color {
        MeterPalette.color(rank: rank, isRemainder: hasOther && rank == names.count - 1)
    }

    var total: Decimal { months.reduce(0) { $0 + $1.total } }

    /// The biggest month's spending, which the bars are drawn against.
    var tallest: Double { NSDecimalNumber(decimal: months.map(\.total).max() ?? 0).doubleValue }

    func total(of name: String) -> Decimal {
        months.reduce(0) { $0 + $1.value(of: name) }
    }

    func month(containing date: Date) -> SpendingStackMonth? {
        months.first { Calendar.current.isDate($0.start, equalTo: date, toGranularity: .month) }
    }

    /// The figure and its line for what is picked: a month, a category, both or neither.
    func reading(month: SpendingStackMonth?, held name: String?) -> (amount: Decimal, caption: String) {
        let span = String(localized: "Last \(months.count) months")
        let monthName = month?.start.formatted(.dateTime.month(.wide).year())
        switch (month, name) {
        case (let month?, let name?): return (month.value(of: name), "\(name) · \(monthName ?? "")")
        case (let month?, nil): return (month.total, monthName ?? "")
        case (nil, let name?): return (total(of: name), "\(name) · \(span)")
        case (nil, nil): return (total, span)
        }
    }

    static func make(from data: CategoryMonths, last count: Int, top: Int = 4) -> SpendingStack? {
        let slots = Array(data.months.indices.suffix(count))
        let ranked = data.categories
            .filter { $0.type == "expense" }
            .map { row in (row: row, total: slots.reduce(Decimal.zero) { $0 + max(row.value(at: $1), 0) }) }
            .filter { $0.total > 0 }
            .sorted { $0.total > $1.total }
        guard !slots.isEmpty, !ranked.isEmpty else { return nil }

        let shown = Array(ranked.prefix(top))
        let rest = Array(ranked.dropFirst(top))
        let otherName = String(localized: "Other")
        let names = shown.map(\.row.category) + (rest.isEmpty ? [] : [otherName])
        let months = slots.map { slot in
            var pieces = shown.enumerated().compactMap { rank, item -> SpendingStackPiece? in
                let value = max(item.row.value(at: slot), 0)
                return value > 0 ? SpendingStackPiece(name: item.row.category, rank: rank, value: value) : nil
            }
            let other = rest.reduce(Decimal.zero) { $0 + max($1.row.value(at: slot), 0) }
            if other > 0 { pieces.append(SpendingStackPiece(name: otherName, rank: shown.count, value: other)) }
            return SpendingStackMonth(id: data.months[slot], start: start(of: data.months[slot]), pieces: pieces)
        }
        return SpendingStack(months: months, names: names, hasOther: !rest.isEmpty)
    }

    /// `2026-03` as the first of that month.
    private static func start(of month: String) -> Date {
        let parts = month.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 2 else { return .distantPast }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: 1)) ?? .distantPast
    }
}
