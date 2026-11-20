/// The purchase a refund gives money back for.
struct RefundOf: Decodable, Hashable {
    let id: String
    let amount: String
    let currency: String
    let category: String
    let transactionDate: String
    let vendorName: String?
}
