import SwiftUI

/// Where the money went: the month's spending as one bar cut by category, with a chip for each. Hold a chip or a piece of the bar and that category lights up while the rest fall back and the figure rolls to its share.
/// The design is Bencho's Context meter (MIT, bencho.dev), redrawn in SwiftUI.
struct SpendingSection: View {
    let rows: [SpendingRow]
    let currency: String
    @State private var hot: SpendingRow.ID?

    private var total: Decimal { rows.reduce(0) { $0 + $1.total } }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle("Where it went")
                .foregroundStyle(.secondary)
                .padding(.horizontal, Spacing.card)
            VStack(alignment: .leading, spacing: 14) {
                SpendingMeterFigure(total: total, held: rows.first { $0.id == hot }, currency: currency)
                SpendingMeterBar(rows: rows, hot: $hot)
                WrapLayout(spacing: 6) {
                    ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                        SpendingMeterChip(row: row, rank: index, currency: currency, isOn: hot == row.id) { toggle(row) }
                    }
                }
            }
            .padding(Spacing.card)
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
        }
        .animation(.smooth(duration: 0.3), value: hot)
    }

    private func toggle(_ row: SpendingRow) {
        hot = hot == row.id ? nil : row.id
    }
}
