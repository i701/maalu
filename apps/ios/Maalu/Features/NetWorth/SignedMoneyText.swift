import SwiftUI

/// An amount that added (+, green) or took away (−, red); the sign carries it as well as the colour.
struct SignedMoneyText: View {
    let value: Decimal
    let currency: String

    var body: some View {
        MoneyText(value, currency: currency, sign: .always(showZero: false))
            .foregroundStyle(value > 0 ? Color.green : value < 0 ? Color.red : Color.secondary)
    }
}
