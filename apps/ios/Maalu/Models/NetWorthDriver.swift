import Foundation

struct NetWorthDriver: Decodable, Identifiable {
    let key: NetWorthDriverKey
    let amount: String

    var id: NetWorthDriverKey { key }
    var value: Decimal { Money.decimal(amount) ?? 0 }
}
