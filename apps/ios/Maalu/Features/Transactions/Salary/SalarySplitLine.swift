import Foundation

/// One line of the split being confirmed: a rule's target with an amount that can be edited.
struct SalarySplitLine: Identifiable, Equatable {
    let id: String
    let targetType: String
    let targetID: String
    let name: String
    let rule: String
    var amount: Decimal?
    /// Whether it will be made.
    var isOn: Bool
    /// Why it cannot be made, or "Already made".
    let reason: String?
    let isDone: Bool
    let isAuto: Bool

    /// The lines of a plan: those that can be made start ticked, the rest show their reason and cannot be ticked.
    static func lines(of plan: SalarySplitPlan) -> [SalarySplitLine] {
        plan.items.map { item in
            SalarySplitLine(
                id: item.ruleId,
                targetType: item.targetType,
                targetID: item.targetId,
                name: item.targetName,
                rule: SalaryRuleText.text(mode: item.mode, value: item.value, currency: plan.currency),
                amount: Money.decimal(item.amount),
                isOn: item.ok && !item.done,
                reason: item.done ? String(localized: "Already made") : item.ok ? nil : (item.reason ?? String(localized: "Can't be made")),
                isDone: item.done,
                isAuto: item.auto
            )
        }
    }

    /// A positive amount with at most four decimals.
    var hasValidAmount: Bool {
        guard let amount, amount > 0 else { return false }
        var rounded = Decimal()
        var copy = amount
        NSDecimalRound(&rounded, &copy, 4, .plain)
        return rounded == amount
    }
}
