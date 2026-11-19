import Foundation

/// A web address typed for a new transaction, sent once the transaction exists.
struct PendingLink: Identifiable {
    let id = UUID()
    let url: String
}
