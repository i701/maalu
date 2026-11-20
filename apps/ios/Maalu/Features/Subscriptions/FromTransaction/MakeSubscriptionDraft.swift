import Foundation

/// Making a payment already in the history the first payment of a new subscription.
struct MakeSubscriptionDraft {
    var name: String
    var count: Int? = 1
    var unit = IntervalUnit.month

    /// The name starts as the vendor's, else the category's.
    init(transaction: Transaction) {
        name = transaction.vendor?.name ?? transaction.category
    }

    var problem: LocalizedStringResource? {
        guard let count, (1...120).contains(count) else { return "Every needs a number from 1 to 120." }
        return nil
    }

    /// A blank name is left out, so the server uses the vendor's or the category's.
    var request: MakeSubscriptionRequest {
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return MakeSubscriptionRequest(name: name.isEmpty ? nil : name, intervalUnit: unit, intervalCount: count ?? 1)
    }
}
