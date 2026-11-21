import SwiftUI

/// Where the money went: the month's spending as one bar cut by category, with a chip for each. Hold a chip or a piece of the bar and that category lights up while the rest fall back and the figure rolls to its share.
/// The design is Bencho's Context meter (MIT, bencho.dev), redrawn in SwiftUI.
struct SpendingSection: View {
    let rows: [SpendingRow]
    let currency: String
    @State private var hot: SpendingRow.ID?

    private var total: Decimal { rows.reduce(0) { $0 + $1.total } }
    private var held: SpendingRow? { rows.first { $0.id == hot } }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle("Where it went")
                .foregroundStyle(.secondary)
                .padding(.horizontal, Spacing.card)
            VStack(alignment: .leading, spacing: 14) {
                MeterFigure(amount: held?.total ?? total, caption: caption, currency: currency)
                SpendingMeterBar(rows: rows, hot: $hot)
                WrapLayout(spacing: 6) {
                    ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                        MeterChip(
                            name: row.name,
                            color: MeterPalette.color(rank: index, isRemainder: row.isOther),
                            value: "\(row.total.formatted(.currency(code: currency))), \(row.share.formatted(.percent.precision(.fractionLength(0))))",
                            isOn: hot == row.id
                        ) { toggle(row) }
                    }
                }
            }
            .padding(Spacing.card)
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
        }
        .animation(.smooth(duration: 0.3), value: hot)
    }

    private var caption: String {
        guard let held else { return String(localized: "Total spent") }
        return "\(held.name) · \(held.share.formatted(.percent.precision(.fractionLength(0))))"
    }

    private func toggle(_ row: SpendingRow) {
        hot = hot == row.id ? nil : row.id
    }
}
