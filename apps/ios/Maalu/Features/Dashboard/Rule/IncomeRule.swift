import Foundation

/// The 50/30/20 rule: at most half of income on needs, at most 30% on wants, at least 20% kept.
struct IncomeRule {
    enum Key: CaseIterable {
        case need, want, save

        var title: LocalizedStringResource {
            switch self {
            case .need: "Needs"
            case .want: "Wants"
            case .save: "Kept"
            }
        }

        var target: Int {
            switch self {
            case .need: 50
            case .want: 30
            case .save: 20
            }
        }

        var targetText: LocalizedStringResource {
            self == .save ? "At least \(target)%" : "Up to \(target)%"
        }
    }

    enum Status {
        case on, over, below

        var title: LocalizedStringResource {
            switch self {
            case .on: "On target"
            case .over: "Over target"
            case .below: "Below target"
            }
        }

        var systemImage: String {
            switch self {
            case .on: "checkmark.circle"
            case .over: "exclamationmark.triangle"
            case .below: "arrow.down.circle"
            }
        }
    }

    struct Row: Identifiable {
        let key: Key
        let amount: Decimal
        let percent: Double
        let status: Status

        var id: Key { key }
    }

    let income: Decimal
    let rows: [Row]
    let unsorted: Decimal?
    let unsortedPercent: Double?

    /// How the period divides against the rule. Needs and wants are the spending in those kinds; kept is income less
    /// all spending (money left over, not a transfer to savings), so it can be negative. Spending in categories with no
    /// kind counts against kept but is not judged. Nil when there was no income to compare with.
    static func make(from categories: [CategoryTotal]) -> IncomeRule? {
        let income = categories.filter { !$0.isExpense }.reduce(Decimal.zero) { $0 + $1.value }
        guard income > 0 else { return nil }
        let spending = categories.filter(\.isExpense)

        func spent(kind: String?) -> Decimal {
            spending.filter { $0.kind == kind }.reduce(Decimal.zero) { $0 + $1.value }
        }
        func row(_ key: Key, _ amount: Decimal) -> Row {
            let percent = percentOfIncome(amount, income)
            let status: Status = key == .save
                ? (percent >= Double(key.target) ? .on : .below)
                : (percent <= Double(key.target) ? .on : .over)
            return Row(key: key, amount: amount, percent: percent, status: status)
        }

        let kept = income - spending.reduce(Decimal.zero) { $0 + $1.value }
        let unsorted = spent(kind: nil)
        return IncomeRule(
            income: income,
            rows: [row(.need, spent(kind: "need")), row(.want, spent(kind: "want")), row(.save, kept)],
            unsorted: unsorted > 0 ? unsorted : nil,
            unsortedPercent: unsorted > 0 ? percentOfIncome(unsorted, income) : nil
        )
    }

    /// Rounded to a tenth, so a figure exactly on target is on target.
    private static func percentOfIncome(_ amount: Decimal, _ income: Decimal) -> Double {
        var exact = amount * 1000 / income
        var rounded = Decimal()
        NSDecimalRound(&rounded, &exact, 0, .plain)
        return NSDecimalNumber(decimal: rounded).doubleValue / 10
    }
}
