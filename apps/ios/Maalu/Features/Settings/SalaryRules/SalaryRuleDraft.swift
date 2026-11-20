import Foundation

struct SalaryRuleDraft {
    enum Target: String, CaseIterable, Identifiable {
        case account, goal

        var id: String { rawValue }

        var title: LocalizedStringResource {
            self == .account ? "An account" : "A goal"
        }
    }

    var target = Target.account
    var targetID: String?
    var mode = SalaryRuleMode.percent
    var value: Decimal?
    var auto = false
    let isNew: Bool

    init() {
        isNew = true
    }

    /// A rule's target is fixed: delete it to point somewhere else.
    init(editing rule: SalaryRule) {
        isNew = false
        mode = rule.mode
        value = Money.decimal(rule.value)
        auto = rule.auto
    }

    var problem: LocalizedStringResource? {
        if isNew, targetID == nil { return target == .account ? "Choose the account." : "Choose the goal." }
        guard let value, value > 0 else { return "Enter an amount above zero." }
        if mode == .percent, value > 100 { return "At most 100 percent." }
        return nil
    }

    var request: SalaryRuleRequest {
        SalaryRuleRequest(
            accountID: isNew && target == .account ? targetID : nil,
            goalID: isNew && target == .goal ? targetID : nil,
            mode: mode,
            value: Money.string(value ?? 0),
            auto: auto
        )
    }
}
