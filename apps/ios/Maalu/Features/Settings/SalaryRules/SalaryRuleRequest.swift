/// A new rule names its account or goal; a change leaves both out, since the target cannot change.
struct SalaryRuleRequest: Encodable {
    var accountID: String?
    var goalID: String?
    var mode: SalaryRuleMode
    var value: String
    var auto: Bool

    private enum CodingKeys: String, CodingKey {
        case mode, value, auto
        case accountID = "account_id"
        case goalID = "goal_id"
    }
}
