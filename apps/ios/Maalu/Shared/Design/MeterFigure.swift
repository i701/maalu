import SwiftUI

/// The big figure of a meter or chart and the line under it; when the amount changes (a piece held, a bar picked) it rolls to the new one.
struct MeterFigure: View {
    let amount: Decimal
    let caption: String
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            MoneyText(amount, currency: currency)
                .font(.largeTitle)
                .contentTransition(.numericText(value: NSDecimalNumber(decimal: amount).doubleValue))
            Text(caption)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
