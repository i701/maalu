import Foundation

/// The stacks of the column chart, ported from the web's `stackSeries` and `distinctAccents`.
enum TrendStack {
    /// The `top` categories that came to most, biggest first (so they sit at the bottom of every column), and everything
    /// else added into one "Other" on top. Refunds past a category's spending count as zero: the table has the exact figures.
    /// A single category is never hidden behind "Other".
    static func series(_ rows: [CategoryMonthRow], top: Int = 6) -> [TrendSeries] {
        let ranked = rows.filter { $0.totalValue > 0 }.sorted { $0.totalValue > $1.totalValue }
        let keepAll = ranked.count <= top + 1
        let shown = keepAll ? ranked : Array(ranked.prefix(top))
        let rest = keepAll ? [] : Array(ranked.dropFirst(top))
        var result = shown.map { row in
            TrendSeries(name: row.parent.map { "\($0) › \(row.category)" } ?? row.category, color: row.color, values: row.values.map { max($0, 0) })
        }
        if let first = rest.first {
            let others = (0..<first.amounts.count).map { month in rest.reduce(Decimal(0)) { $0 + max($1.value(at: month), 0) } }
            result.append(TrendSeries(name: String(localized: "Other"), color: nil, values: others))
        }
        return result
    }

    /// An accent for each series such that no two share one, so every segment of a column can be told apart. The first series
    /// with an accent keeps it; a later one that repeats it gets the first accent from `palette` that no series has.
    /// "Other" (no accent) takes none.
    static func distinctAccents(_ series: [TrendSeries], palette: [String]) -> [String?] {
        let owned = Set(series.compactMap(\.color))
        var used = Set<String>()
        return series.map { item in
            guard let color = item.color else { return nil }
            if used.insert(color).inserted { return color }
            let free = palette.first { !owned.contains($0) && !used.contains($0) }
            if let free { used.insert(free) }
            return free ?? color
        }
    }
}
