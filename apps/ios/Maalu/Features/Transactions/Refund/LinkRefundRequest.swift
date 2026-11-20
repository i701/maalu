/// Turns income you already recorded into a refund of a purchase, with the items given back for a purchase with items.
struct LinkRefundRequest: Encodable {
    let purchaseID: String
    let lines: [RefundLine]?

    private enum Keys: String, CodingKey {
        case splits
        case refundOfId = "refund_of_id"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Keys.self)
        try container.encode(purchaseID, forKey: .refundOfId)
        try container.encodeIfPresent(lines, forKey: .splits)
    }
}
