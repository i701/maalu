import Foundation

/// How a rule and a set of rules read, like the web's `lib/salary.ts`.
enum SalaryRuleText {
    /// "10% of each salary" or "MVR 1,500.00 each time".
    static func text(_ rule: SalaryRule, currency: String) -> String {
        text(mode: rule.mode, value: rule.value, currency: currency)
    }

    static func text(mode: SalaryRuleMode, value: String, currency: String) -> String {
        let value = Money.decimal(value) ?? 0
        switch mode {
        case .percent: return String(localized: "\(value.formatted())% of each salary")
        case .fixed: return String(localized: "\(MoneyFormat.string(value, currency: currency)) each time")
        }
    }

    /// What a set of rules sends on, as one sentence: "35% of the salary + MVR 500.00".
    static func summary(_ rules: [SalaryRule], currency: String) -> String {
        let percent = rules.filter { $0.mode == .percent }.reduce(Decimal(0)) { $0 + (Money.decimal($1.value) ?? 0) }
        let fixed = rules.filter { $0.mode == .fixed }.map { MoneyFormat.string($0.value, currency: currency) }
        let parts = (percent > 0 ? [String(localized: "\(percent.formatted())% of the salary")] : []) + fixed
        return parts.joined(separator: " + ")
    }
}
