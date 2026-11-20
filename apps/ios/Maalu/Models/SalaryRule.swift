/// What one account or goal gets when a salary is split.
struct SalaryRule: Decodable, Identifiable, Hashable {
    let id: String
    let targetType: String
    let accountId: String?
    let goalId: String?
    let targetName: String
    let mode: SalaryRuleMode
    let value: String
    /// Made as soon as a salary is posted; otherwise it waits for approval.
    let auto: Bool

    var isGoal: Bool { targetType == "goal" }
    var targetId: String? { accountId ?? goalId }
}
