import SwiftUI

/// An amount that added (+, green) or took away (−, red); the sign carries it as well as the colour.
struct SignedMoneyText: View {
    let value: Decimal
    let currency: String

    var body: some View {
        Text(value, format: .currency(code: currency).presentation(.isoCode).sign(strategy: .always(showZero: false)))
            .numericFont()
            .foregroundStyle(value > 0 ? Color.green : value < 0 ? Color.red : Color.secondary)
    }
}
