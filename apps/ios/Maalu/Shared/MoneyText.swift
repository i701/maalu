import SwiftUI

struct MoneyText: View {
    let amount: Decimal
    let currency: String

    init(_ amount: Decimal, currency: String) {
        self.amount = amount
        self.currency = currency
    }

    init(_ amount: String, currency: String) {
        self.init(Money.decimal(amount) ?? 0, currency: currency)
    }

    var body: some View {
        Text(amount, format: .currency(code: currency).presentation(.isoCode))
            .monospacedDigit()
    }
}
