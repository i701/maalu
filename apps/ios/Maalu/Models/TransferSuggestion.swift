/// A pair that looks like one move of your own money entered twice: an expense in one account and an income in another.
struct TransferSuggestion: Decodable, Identifiable, Hashable {
    let expense: Transaction
    let income: Transaction
    /// How many days between the two, 0 for the same day.
    let daysApart: Int

    var id: String { expense.id + income.id }
}
