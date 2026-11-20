/// The expense and the income that are the two sides of one transfer.
struct TransferPairRequest: Encodable {
    let expenseID: String
    let incomeID: String

    private enum CodingKeys: String, CodingKey {
        case expenseID = "expense_id"
        case incomeID = "income_id"
    }
}
