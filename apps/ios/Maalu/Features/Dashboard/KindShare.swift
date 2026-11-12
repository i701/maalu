import Foundation

struct KindShare: Identifiable {
    enum Kind: String, CaseIterable {
        case need, want, unsorted

        var title: LocalizedStringResource {
            switch self {
            case .need: "Needs"
            case .want: "Wants"
            case .unsorted: "Not sorted"
            }
        }
    }

    let kind: Kind
    let total: Decimal
    let share: Double

    var id: Kind { kind }

    /// How spending divides into needs, wants and not sorted; nil when nothing was spent.
    static func shares(from categories: [CategoryTotal]) -> [KindShare]? {
        let spending = categories.filter(\.isExpense)
        let totals = Kind.allCases.map { kind in
            let key: String? = kind == .unsorted ? nil : kind.rawValue
            return (kind, spending.filter { $0.kind == key }.reduce(Decimal.zero) { $0 + $1.value })
        }
        let positive = totals.map { max($0.1, 0) }
        let sum = positive.reduce(Decimal.zero, +)
        guard sum > 0 else { return nil }
        return zip(totals, positive).map { entry, amount in
            KindShare(kind: entry.0, total: entry.1, share: NSDecimalNumber(decimal: amount / sum).doubleValue)
        }
    }
}
