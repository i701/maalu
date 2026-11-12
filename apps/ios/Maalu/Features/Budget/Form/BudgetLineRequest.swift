struct BudgetLineRequest: Encodable {
    var name: String?
    var amount: String?
    var categoryIds: [String]?
    var rollover: Bool?
}
