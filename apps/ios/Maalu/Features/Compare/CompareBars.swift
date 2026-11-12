import SwiftUI

/// Two bars per category on one scale, drawn by hand like the web's: what it was before in a
/// muted tone and what it is now in the series colour, each with its value, so the gap between
/// them is the change and nothing overlaps.
struct CompareBars: View {
    let rows: [CompareRow]
    let currency: String

    private var maxValue: Decimal {
        rows.flatMap { [$0.change.now, $0.change.before] }.max() ?? 1
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            legend
            ForEach(rows) { row in
                VStack(alignment: .leading, spacing: 6) {
                    Text(row.name)
                        .font(.subheadline)
                        .lineLimit(1)
                    bar(row.change.now, color: .orange, label: "Now")
                    bar(row.change.before, color: .gray, label: "Before")
                }
            }
        }
    }

    private var legend: some View {
        HStack(spacing: 16) {
            legendItem(String(localized: "Now"), color: .orange)
            legendItem(String(localized: "Before"), color: .gray)
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
    }

    private func legendItem(_ name: String, color: Color) -> some View {
        HStack(spacing: 5) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(name)
        }
        .accessibilityElement(children: .combine)
    }

    private func bar(_ value: Decimal, color: Color, label: LocalizedStringResource) -> some View {
        HStack(spacing: 10) {
            GeometryReader { proxy in
                Capsule()
                    .fill(color)
                    .frame(width: width(value, in: proxy.size.width), height: 8)
                    .frame(width: proxy.size.width, height: 8, alignment: .leading)
            }
            .frame(height: 8)
            .accessibilityHidden(true)
            Text(MoneyFormat.string(value, currency: currency))
                .font(.footnote)
                .foregroundStyle(.secondary)
                .monospacedDigit()
                .accessibilityLabel(String(localized: label) + " " + MoneyFormat.string(value, currency: currency))
        }
    }

    private func width(_ value: Decimal, in available: CGFloat) -> CGFloat {
        guard value > 0 else { return 0 }
        let share = NSDecimalNumber(decimal: value / maxValue).doubleValue
        return max(4, available * CGFloat(share))
    }
}
