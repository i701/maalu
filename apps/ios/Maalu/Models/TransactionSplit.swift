/// One item of a purchase split into items: its line total is tax included, and the items add up to the purchase.
struct TransactionSplit: Decodable, Hashable, Identifiable {
    let id: String
    let name: String
    let quantity: String
    let category: String
    let amount: String
    /// The part of `amount` that is GST, when known.
    let taxAmount: String?
    /// How much of this item refunds so far have given back.
    let refundedAmount: String?
    /// On a refund's line: the item of the purchase it gives back.
    let refundOfSplitId: String?
}
