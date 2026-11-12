/// A charge that repeats, found in what was already paid.
struct SubscriptionCandidate: Decodable, Identifiable, Hashable {
    let vendorId: String
    let vendorName: String
    let currency: String
    let amount: String
    let amountVaries: Bool
    let intervalUnit: IntervalUnit
    let intervalCount: Int
    let occurrences: Int
    let nextDue: String
    let confidence: String

    /// A vendor can be charged in two currencies, so both name a suggestion.
    var id: String { "\(vendorId)-\(currency)" }
    var isRegular: Bool { confidence == "high" }
}
