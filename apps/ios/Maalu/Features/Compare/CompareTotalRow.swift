import SwiftUI

/// Income, spending or kept: the figure for the period being looked at, what it was before, and
/// how far it moved.
struct CompareTotalRow: View {
    let title: LocalizedStringResource
    let change: CompareChange
    let currency: String
    let against: String
    let goodWhenUp: Bool

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(String(localized: title))
                Text("\(MoneyFormat.string(change.before, currency: currency)) in \(against)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        } amount: {
            VStack(alignment: .trailing) {
                MoneyText(change.now, currency: currency)
                CompareDelta(change: change, currency: currency, goodWhenUp: goodWhenUp, state: .both)
            }
        }
    }
}
