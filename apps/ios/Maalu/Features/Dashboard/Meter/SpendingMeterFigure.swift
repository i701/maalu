import SwiftUI

/// The meter's big figure: the month's spending, or the share of the piece held, rolling from one to the other.
struct SpendingMeterFigure: View {
    let total: Decimal
    let held: SpendingRow?
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            MoneyText(held?.total ?? total, currency: currency)
                .font(.largeTitle)
                .contentTransition(.numericText(value: NSDecimalNumber(decimal: held?.total ?? total).doubleValue))
            Text(caption)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var caption: String {
        guard let held else { return String(localized: "Total spent") }
        return "\(held.name) · \(held.share.formatted(.percent.precision(.fractionLength(0))))"
    }
}
