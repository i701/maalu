import Foundation

struct AccountTrend: Decodable {
    let accountId: String
    let currency: String
    let balances: [String]

    var values: [Double] { balances.map { Money.decimal($0).map { NSDecimalNumber(decimal: $0).doubleValue } ?? 0 } }
}
