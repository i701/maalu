import SwiftUI

/// A varying bill is "about", a steady one is exact.
struct SubscriptionAmountText: View {
    let amount: String
    let currency: String
    let varies: Bool

    private var style: Decimal.FormatStyle.Currency {
        .currency(code: currency).presentation(.isoCode)
    }

    var body: some View {
        let value = Money.decimal(amount) ?? 0
        Group {
            if varies {
                Text("about \(value, format: style)")
            } else {
                Text(value, format: style)
            }
        }
        .monospacedDigit()
    }
}
