/// Names a suggestion (to dismiss it) and, when accepting, what the person changed. The server finds the pattern again.
struct SuggestionRequest: Encodable {
    let vendorId: String
    let currency: String
    var name: String?
    var amount: String?
    var intervalCount: Int?
    var intervalUnit: IntervalUnit?

    init(_ candidate: SubscriptionCandidate) {
        vendorId = candidate.vendorId
        currency = candidate.currency
    }
}
