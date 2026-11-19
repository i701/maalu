import Foundation

enum MoneyFormat {
    /// The person's "short numbers" setting (`compact_numbers`), kept on the device so every amount can read it.
    static let shortKey = "shortNumbers"
    /// With short numbers on, amounts from here up are written short.
    static let shortFrom: Decimal = 1000

    static var isShort: Bool { UserDefaults.standard.bool(forKey: shortKey) }

    /// "MVR 1,234.50", or "MVR 1.23K" with short numbers on.
    static func string(
        _ value: Decimal,
        currency: String,
        short: Bool = isShort,
        sign: CurrencyFormatStyleConfiguration.SignDisplayStrategy = .automatic
    ) -> String {
        let style = Decimal.FormatStyle.Currency(code: currency).presentation(.isoCode).sign(strategy: sign)
        if short && abs(value) >= shortFrom {
            return value.formatted(style.notation(.compactName).precision(.fractionLength(0...2)))
        }
        return value.formatted(style)
    }

    /// "MVR 1,234.50", from the API's decimal string. The raw text is shown if it is not a number.
    static func string(_ amount: String, currency: String) -> String {
        guard let value = Money.decimal(amount) else { return amount }
        return string(value, currency: currency)
    }
}
