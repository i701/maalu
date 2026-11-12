import Foundation

enum MoneyFormat {
    /// "MVR 1,234.50", from the API's decimal string. The raw text is shown if it is not a number.
    static func string(_ amount: String, currency: String) -> String {
        guard let value = Money.decimal(amount) else { return amount }
        return value.formatted(.currency(code: currency).presentation(.isoCode))
    }
}
