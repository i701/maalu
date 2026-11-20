import SwiftUI

/// A coloured dot, a name and an amount under it, for the key under a two-part bar.
struct BarLegend: View {
    let title: LocalizedStringKey
    let amount: Decimal
    let currency: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Label {
                Text(title).foregroundStyle(.secondary)
            } icon: {
                Circle().fill(color).frame(width: 8, height: 8)
            }
            .font(.subheadline)
            MoneyText(amount, currency: currency)
                .font(.headline)
        }
    }
}
