/// Where a credit card stands against its last statement, worked out each time by the server. Amounts are in the card's own currency.
struct CardStatement: Decodable, Identifiable, Hashable {
    enum State: String, Decodable {
        /// Nothing was owed when it closed.
        case none
        case paid
        /// Still to pay and not late.
        case due
        /// Still to pay and past its due date.
        case overdue
    }

    let accountId: String
    let accountName: String
    let currency: String
    let statementDay: Int
    let dueDay: Int
    let closedOn: String
    let dueOn: String
    let nextClosesOn: String
    let statementBalance: String
    /// Money put on the card since it closed: repayments, refunds, any income.
    let paidSince: String
    /// The statement less what was paid since.
    let remaining: String
    /// Spent on the card since it closed; it goes on the next statement.
    let spentSince: String
    let state: State
    /// Negative once the due date has passed.
    let daysUntilDue: Int

    var id: String { accountId }
    var owes: Bool { state == .due || state == .overdue }
}
