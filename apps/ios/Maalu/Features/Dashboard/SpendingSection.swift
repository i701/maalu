import SwiftUI

struct SpendingSection: View {
    let rows: [SpendingRow]
    let currency: String

    var body: some View {
        Section("Where it went") {
            ForEach(rows) { row in
                VStack(alignment: .leading) {
                    AmountRow {
                        Text(row.name)
                    } amount: {
                        MoneyText(row.total, currency: currency)
                    }
                    ProgressView(value: row.share)
                        .tint(Color(accent: row.color))
                        .accessibilityLabel(row.name)
                        .accessibilityValue(Text(row.share, format: .percent.precision(.fractionLength(0))))
                }
            }
        }
    }
}
