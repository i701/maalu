import Foundation

struct AvailableToSpend: Decodable {
    let available: String
    let balance: String
    let currency: String
    let periodStart: String
    let periodEnd: String
    let today: String
    let billsTotal: String
    let cardPaymentsTotal: String
    let reservedTotal: String
    let accounts: [AvailableAccount]
    let bills: [AvailableBill]
    let cardPayments: [AvailableCardPayment]
    let reserved: [AvailableReserve]
    let expected: [AvailableBill]

    var isShort: Bool { (Money.decimal(available) ?? 0) < 0 }

    /// The figure without its sign: "Short by" carries the meaning of the minus.
    var magnitude: Decimal { abs(Money.decimal(available) ?? 0) }

    /// The sum in words: what the everyday accounts hold, less bills, card payments and money set aside.
    var summary: String {
        var parts = [String(localized: "\(MoneyFormat.string(balance, currency: currency)) in \(accounts.count) accounts")]
        if !bills.isEmpty {
            parts.append(String(localized: "less \(MoneyFormat.string(billsTotal, currency: currency)) for \(bills.count) bills"))
        }
        if !cardPayments.isEmpty {
            parts.append(String(localized: "\(MoneyFormat.string(cardPaymentsTotal, currency: currency)) for card payments"))
        }
        if !reserved.isEmpty {
            parts.append(String(localized: "\(MoneyFormat.string(reservedTotal, currency: currency)) set aside"))
        }
        return parts.joined(separator: ", ")
    }
}
