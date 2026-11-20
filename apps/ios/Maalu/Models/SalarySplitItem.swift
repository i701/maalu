/// One line of a salary's proposed split: what a rule works out to.
struct SalarySplitItem: Decodable, Identifiable, Hashable {
    let ruleId: String
    let targetType: String
    let targetId: String
    let targetName: String
    let amount: String
    let mode: SalaryRuleMode
    let value: String
    /// False when it cannot be made; `reason` says why.
    let ok: Bool
    let reason: String?
    /// Its rule makes it without asking.
    let auto: Bool
    /// Already made (an automatic rule, or an earlier approval).
    let done: Bool

    var id: String { ruleId }
}
