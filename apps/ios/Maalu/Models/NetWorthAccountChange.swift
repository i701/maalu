import Foundation

struct NetWorthAccountChange: Decodable, Identifiable {
    let accountId: String
    let name: String
    let group: String
    let currency: String
    let start: String
    let end: String
    let change: String

    var id: String { accountId }
    var endValue: Decimal { Money.decimal(end) ?? 0 }
    var changeValue: Decimal { Money.decimal(change) ?? 0 }
}
