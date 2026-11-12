import Foundation

struct BalancePoint: Decodable, Identifiable {
    let date: String
    let total: String

    var id: String { date }
    var day: Date? { ISODate.date(date) }
    var value: Double { Money.decimal(total).map { NSDecimalNumber(decimal: $0).doubleValue } ?? 0 }
}
