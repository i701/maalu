import Foundation

/// What a suggestion becomes, ready to change before it is accepted.
struct SuggestionDraft: Equatable {
    var name: String
    var amount: Decimal?
    var count: Int?
    var unit: IntervalUnit

    init(_ candidate: SubscriptionCandidate) {
        name = candidate.vendorName
        amount = Money.decimal(candidate.amount)
        count = candidate.intervalCount
        unit = candidate.intervalUnit
    }

    var problem: LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the subscription a name." }
        if (amount ?? 0) <= 0 { return "Enter an amount above zero." }
        if (count ?? 0) < 1 { return "How often must be a whole number, 1 or more." }
        return nil
    }

    /// Only what differs from the suggestion is sent.
    func request(for candidate: SubscriptionCandidate) -> SuggestionRequest {
        var request = SuggestionRequest(candidate)
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if trimmed != candidate.vendorName { request.name = trimmed }
        if let amount, amount != Money.decimal(candidate.amount) { request.amount = Money.string(amount) }
        if let count, count != candidate.intervalCount { request.intervalCount = count }
        if unit != candidate.intervalUnit { request.intervalUnit = unit }
        return request
    }
}
