import Foundation

/// A handful of related transactions under a name, and what they add up to. A group changes nothing else about them.
struct TransactionGroup: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let note: String?
    /// Members not in the trash.
    let transactionCount: Int
    let dateFrom: String?
    let dateTo: String?
    /// In the base currency, counting only posted members.
    let moneyIn: String
    let moneyOut: String
    let net: String
    let currency: String

    /// The most a group holds, and the fewest it can keep: one left with fewer is deleted.
    static let most = 50
    static let fewest = 2
}
