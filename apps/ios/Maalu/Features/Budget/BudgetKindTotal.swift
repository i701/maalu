import Foundation

/// How the limits add up by kind, when any limit has one.
struct BudgetKindTotal: Identifiable {
    let kind: String?
    let spent: Decimal
    let limit: Decimal

    var id: String { kind ?? "other" }

    var title: LocalizedStringResource {
        switch kind {
        case "need": "Needs"
        case "want": "Wants"
        default: "Other"
        }
    }

    static func totals(of lines: [BudgetLine]) -> [BudgetKindTotal] {
        guard lines.contains(where: { $0.kind != nil }) else { return [] }
        return ["need", "want", nil].compactMap { kind in
            let mine = lines.filter { $0.kind == kind }
            guard !mine.isEmpty else { return nil }
            return BudgetKindTotal(
                kind: kind,
                spent: mine.reduce(0) { $0 + (Money.decimal($1.activity) ?? 0) },
                limit: mine.reduce(0) { $0 + $1.allowed }
            )
        }
    }
}
