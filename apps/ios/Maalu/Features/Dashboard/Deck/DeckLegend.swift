import SwiftUI

/// A title over an amount, for the foot of a deck card: it takes the card's ink from the text style around it.
struct DeckLegend: View {
    let title: LocalizedStringKey
    let amount: Decimal
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.footnote)
                .opacity(0.8)
            MoneyText(amount, currency: currency)
                .font(.headline)
                .allowsHitTesting(false)
        }
    }
}
