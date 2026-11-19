import Foundation

/// A label that cuts across categories (named so as not to clash with Swift Testing's `Tag`). Its colour is picked by the server and cannot be changed.
struct TagRecord: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let color: String
    /// Transactions not in the trash that have it.
    let transactionCount: Int
    let templateCount: Int
}
