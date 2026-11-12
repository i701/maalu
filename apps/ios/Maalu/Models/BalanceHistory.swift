import Foundation

struct BalanceHistory: Decodable {
    let currency: String
    let points: [AccountBalancePoint]
}

struct AccountBalancePoint: Decodable, Identifiable {
    let date: String
    let balance: String

    var id: String { date }
    var day: Date? { ISODate.date(date) }
    var value: Double { Money.decimal(balance).map { NSDecimalNumber(decimal: $0).doubleValue } ?? 0 }
}
