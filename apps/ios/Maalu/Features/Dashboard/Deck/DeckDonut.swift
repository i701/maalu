import Charts
import SwiftUI

/// A donut of two parts of a whole with a small legend beside it, in the ink of the deck card or flat section around it: the first part solid, the second fainter. Kept against spent on the Dashboard, assets against liabilities on Accounts.
/// The donut-and-legend layout follows a reference analytics screen.
struct DeckDonut: View {
    let first: DonutPart
    let second: DonutPart
    let currency: String
    /// A small bar chart for the space on the right; none leaves it empty.
    var bars: [MiniBar] = []
    @Environment(\.deckInk) private var ink

    var body: some View {
        HStack(spacing: 16) {
            Chart {
                SectorMark(angle: .value("First", first.share), innerRadius: .ratio(0.68), angularInset: 1.5)
                    .foregroundStyle(ink)
                    .cornerRadius(4)
                SectorMark(angle: .value("Second", second.share), innerRadius: .ratio(0.68), angularInset: 1.5)
                    .foregroundStyle(ink.opacity(0.28))
                    .cornerRadius(4)
            }
            .frame(width: 92, height: 92)
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 10) {
                legend(first, dim: false)
                legend(second, dim: true)
            }
            if bars.isEmpty {
                Spacer(minLength: 0)
            } else {
                DeckMiniBars(bars: bars)
                    .frame(height: 92)
                    .frame(minWidth: 70)
            }
        }
    }

    private func legend(_ part: DonutPart, dim: Bool) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Circle().fill(ink.opacity(dim ? 0.28 : 1)).frame(width: 8, height: 8)
            VStack(alignment: .leading, spacing: 1) {
                Text("\(Text(part.title)) \(part.share.formatted(.percent.precision(.fractionLength(0))))")
                    .font(.footnote.weight(.semibold))
                MoneyText(part.amount, currency: currency)
                    .font(.footnote)
                    .opacity(0.8)
                    .allowsHitTesting(false)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
