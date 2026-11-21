import Foundation

extension Account {
    /// The account number and balance as one muted line, such as "0123456789 · MVR 10,120.12": what tells two accounts of one bank apart.
    var numberAndBalance: String {
        [accountNumber.flatMap { $0.isEmpty ? nil : $0 }, MoneyFormat.string(balance, currency: currency)]
            .compactMap { $0 }
            .joined(separator: " · ")
    }
}
