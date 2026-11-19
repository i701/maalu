/// One item of a purchase split into items: its line total is tax included, and the items add up to the purchase.
struct TransactionSplit: Decodable, Hashable, Identifiable {
    let id: String
    let name: String
    let quantity: String
    let category: String
    let amount: String
    /// The part of `amount` that is GST, when known.
    let taxAmount: String?
}
