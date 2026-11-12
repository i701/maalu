import SwiftUI

/// One category in the tables: its dot and name, what it came to in each period, and how far it
/// moved.
struct CompareChangeRow: View {
    let row: CompareRow
    let currency: String
    let goodWhenUp: Bool

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color(accent: row.color))
                        .frame(width: 10, height: 10)
                    Text(row.name)
                }
                Text("\(MoneyFormat.string(row.change.before, currency: currency)) → \(MoneyFormat.string(row.change.now, currency: currency))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        } amount: {
            CompareDelta(change: row.change, currency: currency, goodWhenUp: goodWhenUp, state: row.state)
        }
    }
}
