import SwiftUI

/// A category's chip under the meter: its colour and name. Tap it to hold that piece, tap again to let go.
struct SpendingMeterChip: View {
    let row: SpendingRow
    let rank: Int
    let currency: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(MeterPalette.color(rank: rank, isRemainder: row.isOther))
                    .frame(width: 8, height: 8)
                Text(row.name)
                    .font(.footnote)
                    .lineLimit(1)
            }
            .padding(.horizontal, 12)
            .frame(height: 32)
            .background(Color.primary.opacity(isOn ? 0.14 : 0.06), in: .capsule)
            .scaleEffect(isOn ? 0.975 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(row.name)
        .accessibilityValue("\(row.total.formatted(.currency(code: currency))), \(row.share.formatted(.percent.precision(.fractionLength(0))))")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}
