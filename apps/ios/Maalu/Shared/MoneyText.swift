import SwiftUI

/// An amount. With short numbers on, a large one is written short and a tap shows it in full.
struct MoneyText: View {
    let amount: Decimal
    let currency: String
    let sign: CurrencyFormatStyleConfiguration.SignDisplayStrategy
    @AppStorage(MoneyFormat.shortKey) private var short = false
    @State private var isShowingFull = false

    init(_ amount: Decimal, currency: String, sign: CurrencyFormatStyleConfiguration.SignDisplayStrategy = .automatic) {
        self.amount = amount
        self.currency = currency
        self.sign = sign
    }

    init(_ amount: String, currency: String) {
        self.init(Money.decimal(amount) ?? 0, currency: currency)
    }

    var body: some View {
        let shown = MoneyFormat.string(amount, currency: currency, short: short, sign: sign)
        let full = MoneyFormat.string(amount, currency: currency, short: false, sign: sign)
        if shown == full {
            Text(shown).numericFont()
        } else {
            Button { isShowingFull = true } label: { Text(shown).numericFont() }
                .buttonStyle(.plain)
                .accessibilityLabel(full)
                .popover(isPresented: $isShowingFull) {
                    // the same size everywhere, not the size of the figure it came from
                    Text(full)
                        .numericFont()
                        .font(.body)
                        .fontWeight(.regular)
                        .padding()
                        .presentationCompactAdaptation(.popover)
                }
        }
    }
}
