struct BudgetLineRequest: Encodable {
    var name: String?
    var amount: String?
    var categoryIds: [String]?
    /// Left out when nil; `.some(nil)` is sent as null, which goes back to the budget's level.
    var warnPercent: Int??
    var rollover: Bool?
}
